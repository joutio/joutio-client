import type { ReminderState, RoomFailureKind, RoomState } from '../types.js'
import type {
  RoomAcceptedEvent,
  RoomCompletedEvent,
  RoomCreatedEvent,
  RoomEnteredEvent,
  RoomEvent,
  RoomFailedEvent,
  RoomGameCreatedEvent,
  RoomLeftEvent,
  RoomRemindedEvent,
} from './room-event.js'

/**
 * Modèle client d'une salle : l'état **réagit** aux `RoomEvent` (historique REST + push WebSocket,
 * dédupliqués en amont par `sequenceNumber`). Chaque événement a sa méthode et renvoie une
 * nouvelle instance immuable.
 */
export class Room implements RoomState {
  declare readonly roomId: string
  declare readonly topicId: string | null
  declare readonly origin: RoomState['origin']
  declare readonly sourceGameId: string | null
  declare readonly initiatorId: string | null
  declare readonly opponentId: string | null
  declare readonly participantId: string | null
  declare readonly vsBot: boolean
  declare readonly status: RoomState['status']
  declare readonly gameId: string | null
  declare readonly expiresAt: string | null
  declare readonly initiatorPresent: boolean
  declare readonly participantPresent: boolean
  declare readonly lastReminder: RoomState['lastReminder']
  declare readonly failureReason: string | null

  private constructor(fields: RoomState) {
    Object.assign(this, fields)
  }

  /** État initial d'une salle, avant le premier événement. */
  static empty(roomId: string): Room {
    return new Room({
      roomId,
      topicId: null,
      origin: null,
      sourceGameId: null,
      initiatorId: null,
      opponentId: null,
      participantId: null,
      vsBot: false,
      status: 'WAITING_PLAYERS',
      gameId: null,
      expiresAt: null,
      initiatorPresent: false,
      participantPresent: false,
      lastReminder: null,
      failureReason: null,
    })
  }

  /** Catégorie d'échec à partir du motif serveur (`null`/inconnu → `unknown`). */
  static failureKind(reason: string | null | undefined): RoomFailureKind {
    switch (reason) {
      case 'TOPIC_NOT_AVAILABLE_IN_LANGUAGE':
        return 'language'
      case 'TOPIC_UNAVAILABLE':
        return 'topic'
      case 'PLAYED_QUESTIONS_TIMEOUT':
      case 'QUESTION_DRAW_TIMEOUT':
      case 'GAME_CREATION_TIMEOUT':
        return 'timeout'
      default:
        return 'unknown'
    }
  }

  /** Réagit à un événement du bus : renvoie la salle suivante (application idempotente). */
  onRoomEvent(event: RoomEvent): Room {
    switch (event.type) {
      case 'ROOM_CREATED':
        return this.onRoomCreated(event)
      case 'ROOM_ACCEPTED':
        return this.onRoomAccepted(event)
      case 'ROOM_DECLINED':
        return this.copyWith({ status: 'DECLINED' })
      case 'ROOM_ENTERED':
        return this.onRoomEntered(event)
      case 'ROOM_LEFT':
        return this.onRoomLeft(event)
      case 'ROOM_REMINDED':
        return this.onRoomReminded(event)
      case 'ROOM_ALL_PRESENT':
        return this.onRoomAllPresent()
      case 'ROOM_PLAYERS_LOADED':
        return this.onRoomPlayersLoaded()
      case 'ROOM_PLAYED_QUESTIONS_LOADED':
        return this.onRoomPlayedQuestionsLoaded()
      case 'ROOM_QUESTIONS_LOADED':
        return this.onRoomQuestionsLoaded()
      case 'ROOM_GAME_CREATED':
        return this.onRoomGameCreated(event)
      case 'ROOM_COMPLETED':
        return this.onRoomCompleted(event)
      case 'ROOM_CANCELLED':
        return this.onRoomCancelled()
      case 'ROOM_EXPIRED':
        return this.onRoomExpired()
      case 'ROOM_FAILED':
        return this.onRoomFailed(event)
    }
  }

  /**
   * Appel de l'adversaire absent possible ? Salle nominative en attente, viewer présent, adversaire humain absent,
   * cadence du viewer écoulée. Le serveur reste l'arbitre : ce calcul pilote le bouton.
   */
  reminderState(viewerId: string | null, nowMs: number): ReminderState {
    const unavailable: ReminderState = { available: false, cooldownEndsAt: null }
    if (!viewerId || this.vsBot || this.opponentId === null) return unavailable
    if (this.status !== 'WAITING_PLAYERS') return unavailable

    const viewerIsInitiator = this.initiatorId === viewerId
    if (!viewerIsInitiator && this.participantId !== viewerId) return unavailable
    const viewerPresent = viewerIsInitiator ? this.initiatorPresent : this.participantPresent
    const opponentPresent = viewerIsInitiator ? this.participantPresent : this.initiatorPresent
    if (!viewerPresent || opponentPresent) return unavailable

    const cooldownEndsAt = this.lastReminder?.playerId === viewerId ? Date.parse(this.lastReminder.remindableAt) : null
    if (cooldownEndsAt === null || Number.isNaN(cooldownEndsAt)) return { available: true, cooldownEndsAt: null }
    return { available: cooldownEndsAt <= nowMs, cooldownEndsAt }
  }

  private copyWith(patch: Partial<RoomState>): Room {
    return new Room(Object.assign({}, this, patch))
  }

  private onRoomCreated(event: RoomCreatedEvent): Room {
    return this.copyWith({
      topicId: event.topicId,
      origin: event.origin,
      sourceGameId: event.sourceGameId,
      initiatorId: event.initiatorId,
      opponentId: event.opponentId,
      vsBot: event.vsBot,
      expiresAt: event.expiresAt,
      status: event.status,
    })
  }

  private onRoomAccepted(event: RoomAcceptedEvent): Room {
    return this.copyWith({ status: 'WAITING_PLAYERS', expiresAt: event.expiresAt })
  }

  private onRoomEntered(event: RoomEnteredEvent): Room {
    const isInitiator = event.playerId === this.initiatorId
    const participantId = !isInitiator && this.participantId === null ? event.playerId : this.participantId
    return this.copyWith({
      participantId,
      initiatorPresent: this.initiatorPresent || isInitiator,
      participantPresent: this.participantPresent || (!isInitiator && event.playerId === participantId),
    })
  }

  private onRoomLeft(event: RoomLeftEvent): Room {
    const isInitiator = event.playerId === this.initiatorId
    const isParticipant = event.playerId === this.participantId
    if (!isInitiator && !isParticipant) return this
    // Sortie non destructive : seule la présence s'éteint, la salle reste ouverte.
    return this.copyWith({
      initiatorPresent: isInitiator ? false : this.initiatorPresent,
      participantPresent: isParticipant ? false : this.participantPresent,
    })
  }

  private onRoomReminded(event: RoomRemindedEvent): Room {
    // L'invitation renvoyée se lit sur la vue REST (`remindableAt`) ; ici, seule la cadence d'appel en salle compte.
    if (event.stage !== 'PRESENCE') return this
    return this.copyWith({ lastReminder: { playerId: event.playerId, remindableAt: event.remindableAt } })
  }

  private onRoomAllPresent(): Room {
    return this.copyWith({ status: 'FETCHING_PLAYERS' })
  }

  private onRoomPlayersLoaded(): Room {
    return this.copyWith({ status: 'FETCHING_PLAYED_QUESTIONS' })
  }

  private onRoomPlayedQuestionsLoaded(): Room {
    return this.copyWith({ status: 'FETCHING_QUESTIONS' })
  }

  private onRoomQuestionsLoaded(): Room {
    return this.copyWith({ status: 'CREATING_GAME' })
  }

  private onRoomGameCreated(event: RoomGameCreatedEvent): Room {
    return this.copyWith({ status: 'GAME_CREATED', gameId: event.gameId })
  }

  private onRoomCompleted(event: RoomCompletedEvent): Room {
    return this.copyWith({ status: 'COMPLETED', gameId: event.gameId })
  }

  private onRoomCancelled(): Room {
    return this.copyWith({ status: 'CANCELLED' })
  }

  private onRoomExpired(): Room {
    return this.copyWith({ status: 'EXPIRED' })
  }

  private onRoomFailed(event: RoomFailedEvent): Room {
    return this.copyWith({ status: 'FAILED', failureReason: event.reason ?? null })
  }
}
