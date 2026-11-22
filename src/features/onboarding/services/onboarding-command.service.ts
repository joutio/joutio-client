import type { AbortSignalLike, HttpClient } from '../../../http.js'

/** Commandes de l'entrée dans l'app. */

/** `POST /api/me/onboarding/complete` : valide les centres d'intérêt choisis. */
export async function completeOnboarding(http: HttpClient, interests: readonly string[], signal?: AbortSignalLike): Promise<void> {
  return http.post<void>('/api/me/onboarding/complete', { body: { interests }, signal })
}
