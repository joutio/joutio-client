import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { EventEnvelope } from '../../../core/realtime/stream.js'
import type { GameEvent } from '../domain/game-event.js'
import type { ActiveGameView, GameResultView } from '../types.js'

/** Endpoints des parties et de l'horloge serveur. */

export async function getServerTime(http: HttpClient, signal?: AbortSignalLike): Promise<{ epochMillis: number }> {
  return http.get<{ epochMillis: number }>('/api/clock', { signal })
}

export async function getActiveGames(http: HttpClient, signal?: AbortSignalLike): Promise<ActiveGameView[]> {
  return http.get<ActiveGameView[]>('/api/games', { query: { active: true }, signal })
}

export async function getGameResult(http: HttpClient, gameId: string, signal?: AbortSignalLike): Promise<GameResultView> {
  return http.get<GameResultView>(`/api/games/${segment(gameId)}/result`, { signal })
}

/** Historique des événements d'une partie (rejeu REST du stream). */
export async function getGameEvents(http: HttpClient, gameId: string, signal?: AbortSignalLike): Promise<EventEnvelope<GameEvent>[]> {
  return http.get<EventEnvelope<GameEvent>[]>(`/api/games/${segment(gameId)}/events`, { signal })
}
