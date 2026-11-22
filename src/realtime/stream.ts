/**
 * Moteur de flux d'événements partagé par les deux apps (unifié depuis les `notification-stream`
 * du mobile et `event-stream` du web, 2026-11-22). I/O injecté : l'app fournit `source.load`
 * (historique REST via son `HttpClient`) et `source.subscribe` (son transport STOMP).
 */

/** Enveloppe d'un événement d'agrégat, identique en REST (historique) et en STOMP (`EventEnvelopeResponse` du BFF). */
export interface EventEnvelope<T> {
  aggregateId: string
  sequenceNumber: number
  timestamp: string
  eventType: string
  payload: T
}

export interface EventStreamStatus {
  loaded: boolean
  /** Chargement transitoire en échec : nouvelle tentative planifiée. */
  retrying: boolean
  /** Erreur définitive (4xx) : l'agrégat n'existe pas ou plus. */
  terminalError: boolean
  /** Trou de séquence détecté : rattrapage en cours. */
  lagging: boolean
}

/** Source d'événements d'un agrégat, fournie par l'app (REST + STOMP). */
export interface EventStreamSource<T> {
  /** Historique REST de l'agrégat. */
  load: () => Promise<EventEnvelope<T>[]>
  /** Abonnement live ; `onConnect` est rappelé à chaque (re)connexion. Renvoie le désabonnement. */
  subscribe: (onFrame: (body: string) => void, onConnect: () => void) => () => void
}

export interface EventStreamOptions<T, S> {
  /** Identité stable du flux (ex. `game:{gameId}`) : un changement de clé recrée le flux. */
  key: string
  initial: () => S
  /** Repli pur d'un événement sur l'état (en général une méthode `onGameEvent`/`onRoomEvent` du domaine). */
  apply: (state: S, payload: T) => S
  source: EventStreamSource<T>
  /** Trame live reçue (hors rejeu) : ré-ancrage de l'horloge serveur, par exemple. */
  onLive?: (envelope: EventEnvelope<T>, receivedAt: number) => void
  /**
   * Tolère un `404` au **premier chargement** pendant cette fenêtre (projection Axon de l'agrégat
   * encore en retard, ex. partie fraîchement créée) : l'historique est rejoué au lieu de déclarer
   * l'agrégat absent. `0`/absent = 404 définitif immédiat.
   */
  notFoundGraceMs?: number
  /** Délai entre deux tentatives pendant la fenêtre `404` (défaut 500 ms). */
  notFoundRetryDelayMs?: number
}

const RETRY_BASE_MS = 1_000
const RETRY_MAX_MS = 8_000

/** Délai laissé à une trame manquante pour arriver avant de rejouer l'historique. */
const GAP_GRACE_MS = 400

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Valide le contrat d'enveloppe avant tout fold (ignore les trames malformées). */
const isEnvelope = (value: unknown): value is EventEnvelope<unknown> =>
  isRecord(value) &&
  typeof value.aggregateId === 'string' &&
  typeof value.sequenceNumber === 'number' &&
  isRecord(value.payload) &&
  typeof value.payload.type === 'string'

/**
 * Une erreur 4xx (hors timeout 408 et rate-limit 429) est définitive : pas de retry, l'agrégat
 * est inaccessible. Les erreurs réseau/timeout/5xx sont transitoires et déclenchent un backoff.
 */
const isTerminalError = (error: unknown): boolean => {
  const status = (error as { statusCode?: number } | undefined)?.statusCode
  return status != null && status >= 400 && status < 500 && status !== 408 && status !== 429
}

/**
 * Flux d'événements idempotent : bootstrap par l'historique REST, puis entretien **uniquement** par
 * abonnement live (aucun polling). La déduplication s'appuie sur `sequenceNumber` (REST et WS
 * partagent la même enveloppe). À chaque (re)connexion, l'historique est rejoué pour fermer la
 * fenêtre REST ↔ WS.
 *
 * Robustesse : les trames arrivées dans le désordre sont bufferisées et appliquées dans l'ordre ;
 * un trou non comblé sous `GAP_GRACE_MS` rejoue l'historique ; un rechargement demandé pendant
 * qu'un autre est en vol est rejoué à la fin au lieu d'être abandonné.
 */
export class EventStream<T, S> {
  private readonly options: EventStreamOptions<T, S>
  private state: S
  private lastSequence = -1
  private loading = false
  private reloadQueued = false
  private started = false
  private startedAt = 0
  private pending: EventEnvelope<T>[] = []
  private buffered = new Map<number, EventEnvelope<T>>()
  private gapTimer?: unknown
  private retryTimer?: unknown
  private retryAttempt = 0
  private unsubscribeLive?: () => void
  private status: EventStreamStatus = { loaded: false, retrying: false, terminalError: false, lagging: false }
  private readonly listeners = new Set<() => void>()

  constructor(options: EventStreamOptions<T, S>) {
    this.options = options
    this.state = options.initial()
  }

  getSnapshot = (): S => this.state

  getStatus = (): EventStreamStatus => this.status

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Rejoue l'historique REST (filet de rattrapage quand une trame live est manquée). */
  refresh = (): void => this.requestReload()

  start(): void {
    if (this.started) return
    this.started = true
    this.startedAt = Date.now()
    // Abonnement AVANT le fetch : les trames reçues pendant le chargement de l'historique sont
    // bufferisées puis fusionnées (dédup par séquence).
    this.unsubscribeLive = this.options.source.subscribe((body) => this.onFrame(body), () => this.requestReload())
    if (!this.loading) {
      this.requestReload()
    }
  }

  stop(): void {
    this.started = false
    clearTimeout(this.retryTimer)
    clearTimeout(this.gapTimer)
    this.retryTimer = this.gapTimer = undefined
    this.buffered.clear()
    this.retryAttempt = 0
    this.status = { ...this.status, retrying: false, lagging: false }
    this.unsubscribeLive?.()
    this.unsubscribeLive = undefined
  }

  /** Recharge l'historique ; si un chargement est déjà en vol, on le rejouera à la fin. */
  private requestReload(): void {
    if (this.loading) {
      this.reloadQueued = true
      return
    }
    void this.reload()
  }

  private async reload(): Promise<void> {
    this.loading = true
    this.pending = []
    clearTimeout(this.gapTimer)
    this.gapTimer = undefined
    try {
      const loaded = await this.options.source.load()
      this.state = this.options.initial()
      this.lastSequence = -1
      for (const envelope of Array.isArray(loaded) ? loaded : []) {
        if (isEnvelope(envelope)) this.applyEnvelope(envelope as EventEnvelope<T>)
      }
      // Fusionne les trames live arrivées pendant le chargement (ou bufferisées sur un trou)
      // en respectant strictement l'ordre des séquences.
      const merge = [...this.pending, ...this.buffered.values()].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      this.pending = []
      this.buffered.clear()
      for (const envelope of merge) {
        if (envelope.sequenceNumber <= this.lastSequence) continue
        if (envelope.sequenceNumber === this.lastSequence + 1) this.applyEnvelope(envelope)
        else this.buffered.set(envelope.sequenceNumber, envelope)
      }
      this.retryAttempt = 0
      this.status = { loaded: true, retrying: false, terminalError: false, lagging: this.buffered.size > 0 }
      if (this.buffered.size > 0) this.scheduleGapHeal()
    } catch (error) {
      this.pending = []
      const status = (error as { statusCode?: number } | undefined)?.statusCode
      // 404 initial dans la fenêtre de création : la projection peut être en retard, on rejoue
      // sans afficher « reconnexion » (l'écran garde son libellé de préparation).
      const notFoundGraceActive =
        status === 404 && !this.status.loaded && this.options.notFoundGraceMs != null && Date.now() - this.startedAt < this.options.notFoundGraceMs
      if (notFoundGraceActive) {
        // Cadence fixe courte : la projection fraîche peut apparaître dans les 100–500 ms.
        this.retryAttempt = 0
        this.status = { ...this.status, retrying: false }
        this.scheduleRetry(this.options.notFoundRetryDelayMs ?? 500)
      } else if (isTerminalError(error)) {
        this.retryAttempt = 0
        this.status = { ...this.status, retrying: false, terminalError: true }
      } else if (this.started) {
        this.retryAttempt += 1
        this.status = { ...this.status, retrying: true }
        this.scheduleRetry(Math.min(RETRY_BASE_MS * 2 ** Math.max(0, this.retryAttempt - 1), RETRY_MAX_MS))
      }
    } finally {
      this.loading = false
      this.emit()
      if (this.reloadQueued) {
        this.reloadQueued = false
        this.requestReload()
      }
    }
  }

  private onFrame(body: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return
    }
    if (!isEnvelope(parsed)) return
    const envelope = parsed as EventEnvelope<T>
    if (this.loading) {
      this.pending.push(envelope)
      return
    }
    // Trame live : ré-ancrage de l'horloge serveur (le replay REST n'en fournit pas).
    this.options.onLive?.(envelope, Date.now())
    if (envelope.sequenceNumber <= this.lastSequence) return
    if (envelope.sequenceNumber === this.lastSequence + 1) {
      this.applyEnvelope(envelope)
      let next = this.buffered.get(this.lastSequence + 1)
      while (next) {
        this.buffered.delete(next.sequenceNumber)
        this.applyEnvelope(next)
        next = this.buffered.get(this.lastSequence + 1)
      }
      if (this.buffered.size === 0) {
        clearTimeout(this.gapTimer)
        this.gapTimer = undefined
        this.status = { ...this.status, lagging: false }
      }
      this.emit()
      return
    }
    // Trou de séquence : on attend brièvement la trame manquante avant de rejouer l'historique.
    this.buffered.set(envelope.sequenceNumber, envelope)
    this.status = { ...this.status, lagging: true }
    this.scheduleGapHeal()
    this.emit()
  }

  private applyEnvelope(envelope: EventEnvelope<T>): void {
    const next = this.options.apply(this.state, envelope.payload)
    // Garde défensive : ne jamais corrompre l'état avec `undefined`.
    if (next !== undefined) {
      this.state = next
    }
    this.lastSequence = Math.max(this.lastSequence, envelope.sequenceNumber)
  }

  private scheduleRetry(delay: number): void {
    if (!this.started || this.retryTimer) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.requestReload()
    }, delay)
  }

  private scheduleGapHeal(): void {
    if (this.gapTimer) return
    this.gapTimer = setTimeout(() => {
      this.gapTimer = undefined
      if (this.buffered.size > 0) this.requestReload()
    }, GAP_GRACE_MS)
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}
