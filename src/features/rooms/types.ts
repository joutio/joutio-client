import type { RoomOpponentView } from '../profile/types.js'
import type { TopicRefView } from '../topics/types.js'

/** Statut serveur d'une salle (enum backend `RoomStatus`) : cycle de vie + avancement de la préparation. */
export type RoomStatus =
  | 'WAITING_PLAYERS'
  | 'FETCHING_PLAYERS'
  | 'FETCHING_PLAYED_QUESTIONS'
  | 'FETCHING_QUESTIONS'
  | 'CREATING_GAME'
  | 'GAME_CREATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'

/** Origine d'une salle, fixée à sa création (`RoomOrigin` de matchmaking). */
export type RoomOrigin = 'SHARED' | 'CHALLENGE' | 'REMATCH' | 'MATCHMAKING' | 'BOT'

/** Vue d'une salle (`RoomView`). Le partage se fait via `/join/{roomId}`. */
export interface RoomView {
  roomId: string
  topic: TopicRefView
  status: RoomStatus
  vsBot: boolean
  origin: RoomOrigin
  /** Vrai si le viewer est l'initiateur (seul habilité à annuler la salle). */
  canCancel: boolean
  opponent: RoomOpponentView | null
  initiatorPresent: boolean
  participantPresent: boolean
  gameId: string | null
  createdAt: string
  expiresAt: string
  updatedAt: string
}

/**
 * Catégorie d'échec d'une salle, dérivée du motif serveur pour choisir le message affiché.
 */
export type RoomFailureKind = 'language' | 'topic' | 'timeout' | 'unknown'

/** État de relance du viewer : disponibilité et fin de cadence éventuelle (epoch ms). */
export interface WizzState {
  /** Peut relancer maintenant (salle nominative, adversaire humain absent, cadence écoulée). */
  available: boolean
  /** Fin de la cadence du viewer ; `null` quand aucune relance récente ne la déclenche. */
  cooldownEndsAt: number | null
}

/**
 * Présence d'un joueur dans un salon, poussée sur le flux personnel de l'autre joueur (`ROOM_PRESENCE`, éphémère,
 * hors inbox) : le client relit ses salons.
 */
export interface RoomPresence {
  roomId: string
  playerId: string
  present: boolean
  at: string
}

/** Données pures d'une salle : la forme de l'état porté par `Room`. */
export interface RoomState {
  roomId: string
  topicId: string | null
  initiatorId: string | null
  opponentId: string | null
  participantId: string | null
  vsBot: boolean
  status: RoomStatus
  gameId: string | null
  expiresAt: string | null
  initiatorPresent: boolean
  participantPresent: boolean
  /** Dernière relance (« wizz ») observée : joueur émetteur et instant (cadence anti-spam). */
  lastWizz: { playerId: string; wizzedAt: string } | null
  /** Motif serveur de l'échec (`ROOM_FAILED.reason`), `null` sinon. */
  failureReason: string | null
}

/** Statut serveur d'un ticket (enum backend `MatchmakingStatus`, réduit au cycle de vie). */
export type MatchmakingServerStatus = 'SEARCHING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'

/**
 * État client d'une recherche, replié des événements : `MATCHED`/`CANCELLED`/`EXPIRED` sont des
 * issues terminales (le statut serveur porte `COMPLETED`/`CANCELLED`/`EXPIRED`).
 */
export type MatchmakingStatus = 'SEARCHING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'

/** Vue d'un ticket (`MatchmakingTicketView`). */
export interface MatchmakingTicket {
  ticketId: string
  topicId: string
  status: MatchmakingServerStatus
  roomId: string | null
  opponentId: string | null
  vsBot: boolean
  createdAt: string
  updatedAt: string
}

/** Données pures d'une recherche : la forme de l'état porté par `Matchmaking`. */
export interface MatchmakingState {
  ticketId: string
  topicId: string | null
  status: MatchmakingStatus
  roomId: string | null
  opponentId: string | null
  vsBot: boolean
  /** Adversaire enrichi reçu avec `MATCHED` (la salle reste la source de repli). */
  opponent: RoomOpponentView | null
  /** Fin de la fenêtre de recherche (10 s) — échéance serveur du compte à rebours. */
  deadlineAt: string | null
}

/** `POST /api/rooms` : salle privée partagée par lien. */
export interface CreateRoomCommand {
  topicId: string
}

/** `POST /api/rooms/bot` : salle d'entraînement contre le bot. */
export interface CreateBotRoomCommand {
  topicId: string
  difficulty: 'EASY' | 'NORMAL' | 'HARD'
}
