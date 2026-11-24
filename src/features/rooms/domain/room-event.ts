import type { RoomOrigin, RoomReminderStage, RoomStatus } from '../types.js'

/** Événements côté client (salle), miroir de `RoomEventResponse` en REST et STOMP. */

export type RoomEventType =
  | 'ROOM_CREATED'
  | 'ROOM_ACCEPTED'
  | 'ROOM_DECLINED'
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
  | 'ROOM_REMINDED'

export interface RoomCreatedEvent {
  type: 'ROOM_CREATED'
  roomId: string
  topicId: string
  initiatorId: string
  /** Salle nominative : seul cet invité peut apparaître comme second joueur. */
  opponentId: string | null
  /** Salle contre le bot : le second joueur est joint automatiquement. */
  vsBot: boolean
  origin: RoomOrigin
  /** `INVITED` pour un défi ou une revanche, sinon `WAITING_PLAYERS`. */
  status: RoomStatus
  sourceGameId: string | null
  expiresAt: string | null
}

/** L'invité accepte : la salle attend les deux joueurs jusqu'à `expiresAt`. */
export interface RoomAcceptedEvent {
  type: 'ROOM_ACCEPTED'
  roomId: string
  expiresAt: string
}

/** L'invité refuse : la salle est terminée. */
export interface RoomDeclinedEvent {
  type: 'ROOM_DECLINED'
  roomId: string
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
 * Relance : invitation renvoyée (`INVITATION`) ou adversaire absent appelé (`PRESENCE`, « wizz »). `remindableAt`
 * cale la cadence de l'émetteur.
 */
export interface RoomRemindedEvent {
  type: 'ROOM_REMINDED'
  roomId: string
  /** Le joueur qui relance. */
  playerId: string
  /** Le joueur relancé. */
  targetId: string
  stage: RoomReminderStage
  remindedAt: string
  remindableAt: string
}

export type RoomEvent =
  | RoomCreatedEvent
  | RoomAcceptedEvent
  | RoomDeclinedEvent
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
  | RoomRemindedEvent
