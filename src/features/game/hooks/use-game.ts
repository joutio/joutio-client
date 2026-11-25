import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { HttpClient } from '../../../core/http.js'
import { useLiveQuery } from '../../../core/realtime/use-live-query.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { withReward } from '../domain/result.js'
import { getActiveGames, getGameResult, getServerTime } from '../services/game-query.service.js'
import { gameKeys } from '../query/keys.js'
import type { GameResultView, GameRewardView } from '../types.js'

/** Vue vivante de la récompense d'un duel, côté BFF. */
export const GAME_REWARD_VIEW = 'game-reward'

export const gameQueries = {
  serverTime: (http: HttpClient) =>
    queryOptions({ queryKey: gameKeys.serverTime(), queryFn: ({ signal }) => getServerTime(http, signal) }),
  active: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: gameKeys.active(userId),
      queryFn: userId ? ({ signal }) => getActiveGames(http, signal) : skipToken,
    }),
  /** Résultat d'un duel, lu une fois : il ne change plus après la partie, hors récompense (vue vivante). */
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

/**
 * Récompense d'un duel vue par ce joueur, poussée par profile à chaque écriture (XP des deux joueurs, badges) ;
 * `null` tant qu'il n'est pas récompensé.
 */
export function useGameReward(gameId: string | undefined, userId: string | undefined) {
  return useLiveQuery<GameRewardView, GameRewardView | null>(
    {
      queryKey: gameKeys.reward(gameId, userId),
      view: GAME_REWARD_VIEW,
      key: gameId && userId ? `${gameId}:${userId}` : null,
    },
    (value) => value?.payload ?? null,
  )
}

/**
 * Résultat d'un duel vu par ce joueur, revue des manches comprise : lu une fois, avec la récompense vivante
 * (`useGameReward`) superposée dès qu'elle arrive. Aucune relecture.
 */
export function useGameResult(gameId: string | undefined, userId: string | undefined) {
  const { http } = useJoutio()
  const reward = useGameReward(gameId, userId).data
  const select = useCallback((result: GameResultView) => withReward(result, reward), [reward])
  return useQuery({ ...gameQueries.result(http, gameId), select })
}
