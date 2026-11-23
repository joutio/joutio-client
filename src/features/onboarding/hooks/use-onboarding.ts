import { skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { getRecommendations } from '../services/onboarding-query.service.js'

/** Clés React Query de l'entrée dans l'app, exportées pour les écritures transversales (`queryKeys`). */
export const onboardingKeys = {
  recommendations: (interests: readonly string[]) => ['onboarding', 'recommendations', [...interests]] as const,
}

/** Recommandations de sujets pour les centres d'intérêt choisis. */
export function useRecommendations(http: HttpClient, interests: readonly string[]) {
  return useQuery({
    queryKey: onboardingKeys.recommendations(interests),
    queryFn: interests.length > 0 ? ({ signal }) => getRecommendations(http, interests.join(','), signal) : skipToken,
  })
}
