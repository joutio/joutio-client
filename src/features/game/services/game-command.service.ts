import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { AnswerQuestionCommand } from '../types.js'

/** Réponse à la manche `round` (1 à 7) ; la manche rend le renvoi sûr, `clientElapsedMs` est borné par le serveur. */
export async function answerQuestion(http: HttpClient, gameId: string, command: AnswerQuestionCommand, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/games/${segment(gameId)}/answer`, { body: command, signal })
}

/** `POST /api/games/{id}/abandon` : le joueur abandonne la partie en cours. */
export async function abandonGame(http: HttpClient, gameId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/games/${segment(gameId)}/abandon`, { signal })
}
