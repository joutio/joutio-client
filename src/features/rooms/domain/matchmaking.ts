import type { MatchmakingState } from '../types.js'
import type { MatchmakingEvent, MatchmakingMatchedEvent, MatchmakingSearchingEvent } from './matchmaking-event.js'

/**
 * Modèle client d'une recherche d'appariement : l'état **réagit** aux `MatchmakingEvent`
 * (historique REST + push WebSocket). Chaque événement a sa méthode et renvoie une nouvelle
 * instance immuable.
 */
export class Matchmaking implements MatchmakingState {
  declare readonly ticketId: string
  declare readonly topicId: string | null
  declare readonly status: MatchmakingState['status']
  declare readonly roomId: string | null
  declare readonly opponentId: string | null
  declare readonly vsBot: boolean
  declare readonly opponent: import('../../profile/types.js').RoomOpponentView | null
  declare readonly deadlineAt: string | null

  private constructor(fields: MatchmakingState) {
    Object.assign(this, fields)
  }

  /** État initial d'une recherche, avant le premier événement. */
  static empty(ticketId: string): Matchmaking {
    return new Matchmaking({
      ticketId,
      topicId: null,
      status: 'SEARCHING',
      roomId: null,
      opponentId: null,
      vsBot: false,
      opponent: null,
      deadlineAt: null,
    })
  }

  /** Réagit à un événement du bus : renvoie la recherche suivante (application idempotente). */
  onMatchmakingEvent(event: MatchmakingEvent): Matchmaking {
    switch (event.type) {
      case 'SEARCHING':
        return this.onSearching(event)
      case 'MATCHED':
        return this.onMatched(event)
      case 'CANCELLED':
        return this.onCancelled()
      case 'EXPIRED':
        return this.onExpired()
      case 'FAILED':
        return this.onFailed()
    }
  }

  private copyWith(patch: Partial<MatchmakingState>): Matchmaking {
    return new Matchmaking(Object.assign({}, this, patch))
  }

  private onSearching(event: MatchmakingSearchingEvent): Matchmaking {
    return this.copyWith({ topicId: event.topicId, status: 'SEARCHING', deadlineAt: event.deadlineAt })
  }

  private onMatched(event: MatchmakingMatchedEvent): Matchmaking {
    return this.copyWith({
      status: 'MATCHED',
      roomId: event.roomId,
      opponentId: event.opponentId,
      vsBot: event.vsBot,
      opponent: event.opponent ?? null,
    })
  }

  private onCancelled(): Matchmaking {
    return this.copyWith({ status: 'CANCELLED' })
  }

  private onExpired(): Matchmaking {
    return this.copyWith({ status: 'EXPIRED' })
  }

  private onFailed(): Matchmaking {
    return this.copyWith({ status: 'FAILED' })
  }
}
