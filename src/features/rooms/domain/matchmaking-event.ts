import type { RoomOpponentView } from '../../profile/types.js'

/**
 * Contrat temps réel de l'**appariement public** (enveloppé par `EventEnvelopeResponse` en
 * REST d'historique comme en WebSocket) — miroir du `MatchmakingNotification` du BFF, renommé
 * `MatchmakingEvent` côté client.
 */

export type MatchmakingEventType = 'SEARCHING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'

export interface MatchmakingSearchingEvent {
  type: 'SEARCHING'
  ticketId: string
  topicId: string
  /** Fin de la fenêtre de recherche (10 s) — bornes du compte à rebours client. */
  deadlineAt: string
}

export interface MatchmakingMatchedEvent {
  type: 'MATCHED'
  ticketId: string
  /** Salle d'appariement créée : les deux joueurs y apparaissent. */
  roomId: string
  opponentId: string | null
  vsBot: boolean
  /** Adversaire enrichi pour la carte « Adversaire trouvé » (absent : repli sur `GET /api/rooms/{roomId}`). */
  opponent: RoomOpponentView | null
}

export interface MatchmakingCancelledEvent {
  type: 'CANCELLED'
  ticketId: string
}

/** Fenêtre de recherche écoulée (30 s) sans adversaire : relance ou entraînement. */
export interface MatchmakingExpiredEvent {
  type: 'EXPIRED'
  ticketId: string
}

export interface MatchmakingFailedEvent {
  type: 'FAILED'
  ticketId: string
  reason: string
}

export type MatchmakingEvent =
  | MatchmakingSearchingEvent
  | MatchmakingMatchedEvent
  | MatchmakingCancelledEvent
  | MatchmakingExpiredEvent
  | MatchmakingFailedEvent
