import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { getActiveGames, getGameResult, getServerTime } from '../services/game-query.service.js'
import { gameKeys } from '../query/keys.js'

export const gameQueries = {
  serverTime: (http: HttpClient) =>
    queryOptions({ queryKey: gameKeys.serverTime(), queryFn: ({ signal }) => getServerTime(http, signal) }),
  active: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.active(userId),
      queryFn: userId ? ({ signal }) => getActiveGames(http, signal) : skipToken,
    }),
  result: (http: HttpClient, gameId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.result(gameId),
      queryFn: gameId ? ({ signal }) => getGameResult(http, gameId, signal) : skipToken,
    }),
}

/** Horloge du serveur. */
export function useServerTime() {
  const { http } = useJoutio()
  return useQuery(gameQueries.serverTime(http))
}

/** Parties en cours du joueur (bannière « Rejoindre »). */
export function useActiveGames(userId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(gameQueries.active(http, userId))
}

/** Résultat d'un duel, revue des manches comprise. */
export function useGameResult(gameId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(gameQueries.result(http, gameId))
}
