/**
 * Contrat temps réel d'une **salle** (enveloppé par `EventEnvelopeResponse` en REST
 * d'historique comme en WebSocket) — miroir du `RoomNotification` du BFF, renommé `RoomEvent`
 * côté client : ce sont des événements du bus, pas des notifications d'inbox.
 */

export type RoomEventType =
  | 'ROOM_CREATED'
  | 'ROOM_COMPLETED'
  | 'ROOM_CANCELLED'
  | 'ROOM_EXPIRED'
  | 'ROOM_FAILED'
  | 'ROOM_ENTERED'
  | 'ROOM_LEFT'
  | 'ROOM_ALL_PRESENT'
  | 'ROOM_PLAYERS_LOADED'
  | 'ROOM_PLAYED_QUESTIONS_LOADED'
  | 'ROOM_QUESTIONS_LOADED'
  | 'ROOM_GAME_CREATED'
  | 'ROOM_WIZZED'

export interface RoomCreatedEvent {
  type: 'ROOM_CREATED'
  roomId: string
  topicId: string
  initiatorId: string
  /** Salle nominative : seul cet invité peut apparaître comme second joueur. */
  opponentId: string | null
  /** Salle contre le bot : le second joueur est joint automatiquement. */
  vsBot: boolean
  expiresAt: string | null
}

export interface RoomCompletedEvent {
  type: 'ROOM_COMPLETED'
  roomId: string
  gameId: string
}

export interface RoomCancelledEvent {
  type: 'ROOM_CANCELLED'
  roomId: string
  reason: string
}

export interface RoomExpiredEvent {
  type: 'ROOM_EXPIRED'
  roomId: string
}

export interface RoomFailedEvent {
  type: 'ROOM_FAILED'
  roomId: string
  reason: string
}

export interface RoomEnteredEvent {
  type: 'ROOM_ENTERED'
  roomId: string
  playerId: string
}

export interface RoomLeftEvent {
  type: 'ROOM_LEFT'
  roomId: string
  playerId: string
}

export interface RoomAllPresentEvent {
  type: 'ROOM_ALL_PRESENT'
  roomId: string
}

export interface RoomPlayersLoadedEvent {
  type: 'ROOM_PLAYERS_LOADED'
  roomId: string
}

export interface RoomPlayedQuestionsLoadedEvent {
  type: 'ROOM_PLAYED_QUESTIONS_LOADED'
  roomId: string
}

export interface RoomQuestionsLoadedEvent {
  type: 'ROOM_QUESTIONS_LOADED'
  roomId: string
}

export interface RoomGameCreatedEvent {
  type: 'ROOM_GAME_CREATED'
  roomId: string
  gameId: string
}

/**
 * Relance (« wizz ») d'un adversaire absent — pur temps réel : le joueur émetteur et l'instant
 * permettent au client de caler la cadence (anti-spam) sans rechargement.
 */
export interface RoomWizzedEvent {
  type: 'ROOM_WIZZED'
  roomId: string
  /** Le joueur qui relance. */
  playerId: string
  /** L'adversaire relancé (absent de la salle). */
  targetId: string
  wizzedAt: string
}

export type RoomEvent =
  | RoomCreatedEvent
  | RoomCompletedEvent
  | RoomCancelledEvent
  | RoomExpiredEvent
  | RoomFailedEvent
  | RoomEnteredEvent
  | RoomLeftEvent
  | RoomAllPresentEvent
  | RoomPlayersLoadedEvent
  | RoomPlayedQuestionsLoadedEvent
  | RoomQuestionsLoadedEvent
  | RoomGameCreatedEvent
  | RoomWizzedEvent
