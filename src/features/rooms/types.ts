import type { RoomOpponentView } from '../profile/types.js'
import type { TopicRefView } from '../topics/types.js'

/**
 * Statut serveur d'une salle (enum backend `RoomStatus`) : invitation, attente, avancement de la préparation, fin. Un
 * défi est une salle `INVITED` (l'invité accepte ou refuse).
 */
export type RoomStatus =
  | 'INVITED'
  | 'WAITING_PLAYERS'
  | 'FETCHING_PLAYERS'
  | 'FETCHING_PLAYED_QUESTIONS'
  | 'FETCHING_QUESTIONS'
  | 'CREATING_GAME'
  | 'GAME_CREATED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'

/**
 * Origine d'une salle, fixée à sa création (`RoomOrigin` de matchmaking) : défi et revanche nomment un invité qui
 * accepte, un salon partagé est ouvert au premier qui ouvre le lien, l'appariement nomme les deux joueurs.
 */
export type RoomOrigin = 'SHARED' | 'CHALLENGE' | 'REMATCH' | 'MATCHMAKING' | 'BOT'

/** Second joueur nommé (`NOMINATIVE`) ou premier venu par le lien (`OPEN_LINK`). */
export type RoomAccess = 'NOMINATIVE' | 'OPEN_LINK'

/** Vue d'une salle (`RoomView`). Le partage se fait via `go.joutio.com/j/{roomId}`. */
export interface RoomView {
  roomId: string
  topic: TopicRefView
  status: RoomStatus
  vsBot: boolean
  origin: RoomOrigin
  access: RoomAccess
  /** Vrai si le viewer est l'initiateur : seul habilité à annuler la salle et à relancer l'invitation. */
  canCancel: boolean
  opponent: RoomOpponentView | null
  initiatorPresent: boolean
  participantPresent: boolean
  gameId: string | null
  /** Partie terminée d'origine d'une revanche. */
  sourceGameId: string | null
  createdAt: string
  /** Échéance de l'étape en cours : réponse à l'invitation, puis attente des joueurs. */
  expiresAt: string
  /** Prochaine relance possible de l'invitation (`INVITED` seulement). */
  remindableAt: string | null
  updatedAt: string
}

/** Sections de l'onglet Défis (`defis.md`). */
export interface DefisSections {
  /** Défis reçus en attente de ma réponse, les plus proches de l'échéance d'abord. */
  received: RoomView[]
  /** Défis envoyés en attente de la réponse de l'invité. */
  sent: RoomView[]
  /** Salles qui attendent les joueurs : défis acceptés, salons partagés, appariements. Jamais le bot. */
  waiting: RoomView[]
}

/**
 * Changement d'étape d'une salle du joueur (`ROOM_STATUS` sur son flux personnel) : défi reçu ou envoyé, accepté,
 * refusé, annulé, expiré, partie créée. Éphémère, indépendant de l'inbox et des préférences.
 */
export interface RoomStatusChange {
  roomId: string
  status: RoomStatus
  expiresAt: string | null
  at: string
}

/** Refus d'entrée dans une salle, poussé sur `/user/queue/room-presence`. */
export type JoinRefusal = 'FULL' | 'NOT_INVITED' | 'UNAVAILABLE' | 'GONE'

/** Étape d'une relance : invitation renvoyée, ou appel d'un joueur absent (« wizz »). */
export type RoomReminderStage = 'INVITATION' | 'PRESENCE'

/**
 * Catégorie d'échec d'une salle, dérivée du motif serveur pour choisir le message affiché.
 */
export type RoomFailureKind = 'language' | 'topic' | 'timeout' | 'unknown'

/** État de relance du viewer dans la salle : disponibilité et fin de cadence éventuelle (epoch ms). */
export interface ReminderState {
  /** Peut appeler maintenant (salle nominative, adversaire humain absent, cadence écoulée). */
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
  origin: RoomOrigin | null
  /** Partie d'origine d'une revanche. */
  sourceGameId: string | null
  initiatorId: string | null
  opponentId: string | null
  participantId: string | null
  vsBot: boolean
  status: RoomStatus
  gameId: string | null
  expiresAt: string | null
  initiatorPresent: boolean
  participantPresent: boolean
  /** Dernier appel d'un joueur absent observé : émetteur et prochaine relance possible (cadence anti-spam). */
  lastReminder: { playerId: string; remindableAt: string } | null
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

/** `POST /api/rooms` : salon partagé par lien. */
export interface CreateRoomCommand {
  topicId: string
}

/** `POST /api/rooms/challenge` : défi, ou revanche quand `gameId` (partie terminée d'origine) est présent. */
export interface CreateChallengeCommand {
  topicId: string
  opponentId: string
  gameId?: string
}

/** `POST /api/rooms/bot` : salle d'entraînement contre le bot. */
export interface CreateBotRoomCommand {
  topicId: string
  difficulty: 'EASY' | 'NORMAL' | 'HARD'
}
