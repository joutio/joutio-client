import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { getActiveGames, getGameResult, getServerTime } from '../services/game-query.service.js'
import { gameKeys } from '../query/keys.js'
import type { GameResultView } from '../types.js'

/** Relecture du résultat tant que la récompense manque : 1,5 s, 20 lectures au plus (≈ 30 s). */
export const REWARD_POLL = { intervalMs: 1_500, reads: 20 } as const

/** Le résultat attend encore sa récompense (projection en retard) et peut encore être relu. */
const awaitsReward = (result: GameResultView | undefined, reads: number) =>
  result !== undefined && result.reward === null && !result.botGame && reads < REWARD_POLL.reads

export const gameQueries = {
  serverTime: (http: HttpClient) =>
    queryOptions({ queryKey: gameKeys.serverTime(), queryFn: ({ signal }) => getServerTime(http, signal) }),
  active: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.active(userId),
      queryFn: userId ? ({ signal }) => getActiveGames(http, signal) : skipToken,
    }),
  /**
   * Résultat d'un duel. Exception documentée au « jamais de relecture d'elle-même » : aucun canal ne porte la
   * récompense, calculée après la fin ; tant qu'elle manque (`reward: null`, hors entraînement), le résultat est relu
   * toutes les `REWARD_POLL.intervalMs` par TanStack (`refetchInterval`), `REWARD_POLL.reads` lectures au plus, puis
   * plus jamais. Les badges suivent l'achievement `BADGE` (`useJoutioSync`).
   */
  result: (http: HttpClient, gameId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.result(gameId),
      queryFn: gameId ? ({ signal }) => getGameResult(http, gameId, signal) : skipToken,
      refetchInterval: (query) =>
        awaitsReward(query.state.data, query.state.dataUpdateCount) ? REWARD_POLL.intervalMs : false,
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

/** Résultat d'un duel, revue des manches comprise ; relu de lui-même tant que la récompense manque (`REWARD_POLL`). */
export function useGameResult(gameId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(gameQueries.result(http, gameId))
}
