import { typed } from '../../../core/query/keys.js'
import type { ActiveGameView, GameResultView } from '../types.js'

export const gameKeys = {
  root: ['games'] as const,
  /** Parties en cours du joueur (`/api/games?active=true`). */
  active: (userId: string | undefined) => typed<ActiveGameView[]>()(['games', 'active', userId]),
  /** Toutes les listes de parties en cours (préfixe). */
  actives: () => ['games', 'active'] as const,
  result: (gameId: string | undefined) => typed<GameResultView>()(['games', 'detail', gameId, 'result']),
  /** Horloge du serveur (`/api/clock`). */
  serverTime: () => typed<{ epochMillis: number }>()(['clock']),
  mutations: {
    answer: (gameId: string) => ['games', 'answer', gameId] as const,
    abandon: (gameId: string) => ['games', 'abandon', gameId] as const,
  },
}
