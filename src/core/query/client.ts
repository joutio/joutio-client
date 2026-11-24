import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'
import type { ApiError } from '../types/common.js'

/** Une 4xx est définitive : rejouer ne changerait pas la réponse. */
export const isClientError = (error: unknown) => {
  const status = (error as Partial<ApiError> | null)?.statusCode
  return typeof status === 'number' && status >= 400 && status < 500
}

/** Une seule nouvelle tentative, et jamais sur une 4xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && !isClientError(error)
}

/**
 * Politique de fraîcheur des deux apps (`docs/frontend/donnees-et-etat.md`) : une donnée ne se relit jamais d'elle-même.
 * Elle change par le premier chargement, les mutations optimistes, les événements temps réel et le tiré pour
 * rafraîchir. Une vue qu'un événement a rendue périmée (`refetchType: 'none'`) est relue à sa prochaine ouverture
 * (`refetchOnMount` par défaut : seulement si périmée).
 */
export const queryClientDefaults = {
  queries: {
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: shouldRetry,
  },
  mutations: { retry: false },
} satisfies NonNullable<QueryClientConfig['defaultOptions']>

export function createJoutioQueryClient(config: Omit<QueryClientConfig, 'defaultOptions'> = {}): QueryClient {
  return new QueryClient({ ...config, defaultOptions: queryClientDefaults })
}
