import type { RoomState } from '../types.js'
import type {
  RoomCompletedEvent,
  RoomCreatedEvent,
  RoomEnteredEvent,
  RoomEvent,
  RoomFailedEvent,
  RoomGameCreatedEvent,
  RoomLeftEvent,
  RoomWizzedEvent,
} from './room-event.js'

/** Cadence anti-spam entre deux relances du même joueur (miroir backend `RoomWizzRules`). */
export const WIZZ_COOLDOWN_MS = 10_000

/**
 * Modèle client d'une salle : l'état **réagit** aux `RoomEvent` (historique REST + push WebSocket,
 * dédupliqués en amont par `sequenceNumber`). Chaque événement a sa méthode et renvoie une
 * nouvelle instance immuable.
 */
export class Room implements RoomState {
  declare readonly roomId: string
  declare readonly topicId: string | null
  declare readonly initiatorId: string | null
  declare readonly opponentId: string | null
  declare readonly participantId: string | null
  declare readonly vsBot: boolean
  declare readonly status: RoomState['status']
  declare readonly gameId: string | null
  declare readonly expiresAt: string | null
  declare readonly initiatorPresent: boolean
  declare readonly participantPresent: boolean
  declare readonly lastWizz: { playerId: string; wizzedAt: string } | null
  declare readonly failureReason: string | null

  private constructor(fields: RoomState) {
    Object.assign(this, fields)
  }

  /** État initial d'une salle, avant le premier événement. */
  static empty(roomId: string): Room {
    return new Room({
      roomId,
      topicId: null,
      initiatorId: null,
      opponentId: null,
      participantId: null,
      vsBot: false,
      status: 'WAITING_PLAYERS',
      gameId: null,
      expiresAt: null,
      initiatorPresent: false,
      participantPresent: false,
      lastWizz: null,
      failureReason: null,
    })
  }

  /** Catégorie d'échec à partir du motif serveur (`null`/inconnu → `unknown`). */
  static failureKind(reason: string | null | undefined): import('../types.js').RoomFailureKind {
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
      case 'ROOM_ENTERED':
        return this.onRoomEntered(event)
      case 'ROOM_LEFT':
        return this.onRoomLeft(event)
      case 'ROOM_WIZZED':
        return this.onRoomWizzed(event)
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
   * Relance possible ? Salle nominative en attente, viewer présent, adversaire humain absent,
   * cadence du viewer écoulée. Le serveur reste l'arbitre (agrégat) — ce calcul pilote le bouton.
   */
  wizzState(viewerId: string | null, nowMs: number): import('../types.js').WizzState {
    const unavailable: import('../types.js').WizzState = { available: false, cooldownEndsAt: null }
    if (!viewerId || this.vsBot || this.opponentId === null) return unavailable
    if (this.status !== 'WAITING_PLAYERS') return unavailable

    const viewerIsInitiator = this.initiatorId === viewerId
    if (!viewerIsInitiator && this.participantId !== viewerId) return unavailable
    const viewerPresent = viewerIsInitiator ? this.initiatorPresent : this.participantPresent
    const opponentPresent = viewerIsInitiator ? this.participantPresent : this.initiatorPresent
    if (!viewerPresent || opponentPresent) return unavailable

    const cooldownEndsAt = this.lastWizz?.playerId === viewerId ? Date.parse(this.lastWizz.wizzedAt) + WIZZ_COOLDOWN_MS : null
    const available = cooldownEndsAt === null || Number.isNaN(cooldownEndsAt) || cooldownEndsAt <= nowMs
    return {
      available,
      cooldownEndsAt: cooldownEndsAt !== null && !Number.isNaN(cooldownEndsAt) ? cooldownEndsAt : null,
    }
  }

  private copyWith(patch: Partial<RoomState>): Room {
    return new Room(Object.assign({}, this, patch))
  }

  private onRoomCreated(event: RoomCreatedEvent): Room {
    return this.copyWith({
      topicId: event.topicId,
      initiatorId: event.initiatorId,
      opponentId: event.opponentId,
      vsBot: event.vsBot,
      expiresAt: event.expiresAt,
      status: 'WAITING_PLAYERS',
    })
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

  private onRoomWizzed(event: RoomWizzedEvent): Room {
    // Pur temps réel : seule la cadence du joueur émetteur est mémorisée (le bouton se grise).
    return this.copyWith({
      lastWizz: { playerId: event.playerId, wizzedAt: event.wizzedAt },
    })
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
