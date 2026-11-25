/**
 * Moteur de flux d'événements partagé par les deux apps : historique REST à l'ouverture (et à
 * chaque reconnexion), puis entretien uniquement par abonnement live. I/O injecté : l'app fournit
 * `source.load` (historique REST via son `HttpClient`) et `source.subscribe` (son transport STOMP).
 *
 * Contrat : la livraison est **en ordre** par agrégat (vue vivante du BFF, broker STOMP simple). Le moteur
 * déduplique par `sequenceNumber` (REST et WS se chevauchent) et tamponne les trames live arrivées pendant le
 * chargement de l'historique. Un **trou** de séquence (abonné qui rejoint un flux déjà ouvert : le BFF ne lui envoie
 * que le dernier événement) relit l'historique tout de suite ; une reconnexion le relit aussi.
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
  /** Erreur définitive (404/403) : l'agrégat n'existe pas, plus, ou est inaccessible au joueur. */
  notFound: boolean
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
  /**
   * Effet sur le cache après chaque événement replié, historique compris (fin de partie…). Une reconnexion rejoue
   * l'historique : l'effet doit être idempotent.
   */
  onEvent?: (state: S, payload: T) => void
}

/**
 * Lecture de l'historique : `load` tel quel par défaut. `useEventStream` la confie à TanStack Query pour le délai de
 * grâce d'un agrégat neuf ; `fresh()` dit, à chaque échec, si le flux attend encore son premier historique.
 */
export type HistoryReader<T> = (
  load: () => Promise<EventEnvelope<T>[]>,
  fresh: () => boolean,
) => Promise<EventEnvelope<T>[]>

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Valide le contrat d'enveloppe avant tout fold (ignore les trames malformées). */
const isEnvelope = (value: unknown): value is EventEnvelope<unknown> =>
  isRecord(value) &&
  typeof value.aggregateId === 'string' &&
  typeof value.sequenceNumber === 'number' &&
  isRecord(value.payload) &&
  typeof value.payload.type === 'string'

/** Une erreur 4xx (hors timeout 408 et rate-limit 429) est définitive : l'agrégat est inaccessible. */
const isNotFoundError = (error: unknown): boolean => {
  const status = (error as { statusCode?: number } | undefined)?.statusCode
  return status != null && status >= 400 && status < 500 && status !== 408 && status !== 429
}

/**
 * Flux d'événements idempotent : bootstrap par l'historique REST, puis entretien **uniquement** par
 * abonnement live (aucun polling). La déduplication s'appuie sur `sequenceNumber` (REST et WS
 * partagent la même enveloppe). À chaque (re)connexion, l'historique est rejoué pour fermer la
 * fenêtre REST ↔ WS.
 *
 * Une erreur transitoire laisse le flux non chargé : la prochaine reconnexion du transport (ou `resync()`)
 * rejouera l'historique (aucun timer, aucun backoff maison ; le délai de grâce d'un agrégat neuf passe par le
 * `HistoryReader` que fournit `useEventStream`).
 */
export class EventStream<T, S> {
  private readonly options: EventStreamOptions<T, S>
  private state: S
  private lastSequence = -1
  private loading = false
  private reloadQueued = false
  private started = false
  private everLoaded = false
  private pending: EventEnvelope<T>[] = []
  private unsubscribeLive?: () => void
  private status: EventStreamStatus = { loaded: false, notFound: false }
  private readonly listeners = new Set<() => void>()

  private readonly readHistory: HistoryReader<T>

  constructor(options: EventStreamOptions<T, S>, readHistory: HistoryReader<T> = (load) => load()) {
    this.options = options
    this.readHistory = readHistory
    this.state = options.initial()
  }

  getSnapshot = (): S => this.state

  getStatus = (): EventStreamStatus => this.status

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): void {
    if (this.started) return
    this.started = true
    // Abonnement AVANT le fetch : les trames reçues pendant le chargement de l'historique sont
    // tamponnées puis fusionnées (dédup par séquence).
    this.unsubscribeLive = this.options.source.subscribe(
      (body) => this.onFrame(body),
      () => this.requestReload(),
    )
    if (!this.loading) {
      this.requestReload()
    }
  }

  /**
   * Rejoue l'historique REST à la demande (l'app détecte un retard : chrono dépassé, manche qui ne s'ouvre pas). Même
   * chemin qu'une reconnexion : dédup par séquence, trames live tamponnées pendant la lecture.
   */
  resync(): void {
    if (this.started) this.requestReload()
  }

  stop(): void {
    this.started = false
    this.pending = []
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
    try {
      const loaded = await this.readHistory(this.options.source.load, () => this.started && !this.everLoaded)
      this.state = this.options.initial()
      this.lastSequence = -1
      for (const envelope of Array.isArray(loaded) ? loaded : []) {
        if (isEnvelope(envelope)) this.applyEnvelope(envelope as EventEnvelope<T>)
      }
      // Fusionne les trames live arrivées pendant le chargement, dans l'ordre des séquences.
      const merge = [...this.pending].sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      this.pending = []
      for (const envelope of merge) {
        if (envelope.sequenceNumber <= this.lastSequence) continue
        if (envelope.sequenceNumber === this.lastSequence + 1) this.applyEnvelope(envelope)
        else this.reloadQueued = true // trou : l'historique relu juste après le comble
      }
      this.everLoaded = true
      this.status = { loaded: true, notFound: false }
    } catch (error) {
      this.pending = []
      this.status = { loaded: false, notFound: isNotFoundError(error) }
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
    if (envelope.sequenceNumber <= this.lastSequence) return
    if (envelope.sequenceNumber === this.lastSequence + 1) {
      this.applyEnvelope(envelope)
      this.emit()
      return
    }
    // Trou de séquence : relire l'historique, qui contient déjà cet événement (émis au commit).
    this.requestReload()
  }

  private applyEnvelope(envelope: EventEnvelope<T>): void {
    const next = this.options.apply(this.state, envelope.payload)
    // Garde défensive : ne jamais corrompre l'état avec `undefined`.
    if (next !== undefined) {
      this.state = next
    }
    this.lastSequence = Math.max(this.lastSequence, envelope.sequenceNumber)
    this.options.onEvent?.(this.state, envelope.payload)
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}
