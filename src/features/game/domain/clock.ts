/**
 * Horloge serveur du client (`duel-horloge-ntp`) : décalage `serveur − appareil` estimé à la manière de NTP.
 *
 * - **Aller-retour** `GET /api/clock` : l'instant serveur est pris au milieu de l'aller-retour (`(envoi + réception) / 2`),
 *   erreur au plus `RTT / 2`. On garde l'échantillon de **RTT minimal** d'une fenêtre récente : le moins bruité.
 * - **Trame temps réel** : `instant serveur − réception` sous-estime le décalage de la latence du push. C'est donc
 *   une **borne basse** : elle peut relever le décalage, jamais le baisser.
 * - **Montre de l'appareil déplacée** : un aller-retour dont l'intervalle certain exclut l'estimation courante repart de
 *   zéro (échantillons et borne basse).
 *
 * Fonctions pures : l'instant courant et les mesures sont des paramètres.
 */

export interface ClockSample {
  /** Décalage estimé `serveur − appareil` (ms). */
  offsetMs: number
  /** Durée de l'aller-retour (ms). */
  rttMs: number
  /** Instant de réception, horloge de l'appareil (ms epoch). */
  at: number
}

export interface ClockState {
  samples: readonly ClockSample[]
  /** Plus grande borne basse vue sur les trames temps réel depuis le dernier recalage, ou `null`. */
  floorMs: number | null
}

export interface RoundTrip {
  /** Envoi de la requête, horloge de l'appareil (ms epoch). */
  sentAt: number
  /** Réception de la réponse, horloge de l'appareil (ms epoch). */
  receivedAt: number
  /** Instant serveur renvoyé (ms epoch). */
  serverEpochMs: number
}

/** Échantillons gardés : les plus récents. */
export const CLOCK_WINDOW = 8
/** Âge au-delà duquel un échantillon sort de la fenêtre (ms). */
export const CLOCK_MAX_AGE_MS = 10 * 60_000
/** Marge avant de conclure à une montre déplacée plutôt qu'à du bruit (ms). */
export const CLOCK_JUMP_MARGIN_MS = 1_000
/** Mesures d'une rafale de synchronisation (entrée dans un écran de jeu, retour au premier plan). */
export const CLOCK_BURST = 5

export const emptyClock: ClockState = { samples: [], floorMs: null }

const bestSample = (samples: readonly ClockSample[]) =>
  samples.reduce<ClockSample | null>(
    (best, sample) => (best === null || sample.rttMs < best.rttMs ? sample : best),
    null,
  )

/** Décalage courant `serveur − appareil` (ms), `null` avant toute mesure. */
export function clockOffset(state: ClockState): number | null {
  const best = bestSample(state.samples)
  if (best === null) return state.floorMs
  return state.floorMs === null ? best.offsetMs : Math.max(best.offsetMs, state.floorMs)
}

/** Ajoute un aller-retour `GET /api/clock`. */
export function addRoundTrip(state: ClockState, { sentAt, receivedAt, serverEpochMs }: RoundTrip): ClockState {
  if (!Number.isFinite(serverEpochMs) || receivedAt < sentAt) return state
  const sample: ClockSample = {
    offsetMs: serverEpochMs - (sentAt + receivedAt) / 2,
    rttMs: receivedAt - sentAt,
    at: receivedAt,
  }
  const current = clockOffset(state)
  // Le vrai décalage est certainement dans [serveur − réception, serveur − envoi] : une estimation hors de cet
  // intervalle (marge comprise) vient d'une montre d'appareil déplacée, l'historique ne vaut plus rien.
  const jumped =
    current !== null &&
    (current < serverEpochMs - receivedAt - CLOCK_JUMP_MARGIN_MS ||
      current > serverEpochMs - sentAt + CLOCK_JUMP_MARGIN_MS)
  if (jumped) return { samples: [sample], floorMs: null }
  const samples = [...state.samples.filter((kept) => receivedAt - kept.at <= CLOCK_MAX_AGE_MS), sample].slice(
    -CLOCK_WINDOW,
  )
  return { samples, floorMs: state.floorMs }
}

/** Ajoute l'instant serveur d'une trame temps réel reçue à `receivedAt` : borne basse du décalage. */
export function addLiveFrame(state: ClockState, serverEpochMs: number, receivedAt: number): ClockState {
  if (!Number.isFinite(serverEpochMs)) return state
  const bound = serverEpochMs - receivedAt
  return state.floorMs !== null && bound <= state.floorMs ? state : { samples: state.samples, floorMs: bound }
}
