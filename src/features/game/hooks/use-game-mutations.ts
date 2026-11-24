import { useMutation } from '@tanstack/react-query'
import { change } from '../../../core/query/optimistic.js'
import { isClientError } from '../../../core/query/client.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import { gameKeys } from '../query/keys.js'
import type { AnswerQuestionCommand } from '../types.js'
import { abandonGame, answerQuestion } from '../services/game-command.service.js'

/** Délai entre deux envois d'une réponse tant que la manche est ouverte (`parties.md`). */
export const ANSWER_RETRY_DELAY_MS = 2_500

/**
 * Réponse à une manche. Le serveur est idempotent par manche : une erreur réseau ou serveur est renvoyée toutes les
 * 2,5 s, quatre fois au plus ; une 4xx (manche close, échéance dépassée) ne l'est pas. Le score vient du flux de la
 * partie, jamais d'ici.
 */
export function useAnswerQuestion(gameId: string) {
  const { http } = useJoutio()
  return useMutation({
    mutationKey: gameKeys.mutations.answer(gameId),
    mutationFn: (command: AnswerQuestionCommand) => answerQuestion(http, gameId, command),
    retry: (failureCount, error) => failureCount < 4 && !isClientError(error),
    retryDelay: ANSWER_RETRY_DELAY_MS,
  })
}

/** Abandonne la partie : elle quitte tout de suite les parties en cours. */
export function useAbandonGame(gameId: string, userId: string) {
  return useOptimisticMutation({
    mutationKey: gameKeys.mutations.abandon(gameId),
    mutationFn: (_: void, { http }) => abandonGame(http, gameId),
    touches: () => [gameKeys.active(userId)],
    apply: (client) => {
      const removed = client.getQueryData(gameKeys.active(userId))?.find((game) => game.gameId === gameId)
      return change(
        client,
        { queryKey: gameKeys.active(userId), exact: true },
        (games) => games.filter((game) => game.gameId !== gameId),
        (games) => (removed && !games.some((game) => game.gameId === gameId) ? [removed, ...games] : games),
      )
    },
  })
}
