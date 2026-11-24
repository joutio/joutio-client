import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import { changeAccount } from '../../me/cache/account.js'
import { meKeys } from '../../me/query/keys.js'
import { completeOnboarding } from '../services/onboarding-command.service.js'
import { getRecommendations } from '../services/onboarding-query.service.js'
import { onboardingKeys } from '../query/keys.js'

export const onboardingQueries = {
  recommendations: (http: HttpClient, interests: readonly string[]) =>
    queryOptions({
      queryKey: onboardingKeys.recommendations(interests),
      queryFn: interests.length > 0 ? ({ signal }) => getRecommendations(http, interests.join(','), signal) : skipToken,
    }),
}

/** Recommandations de sujets pour les centres d'intérêt choisis ; aucun choix : aucune requête. */
export function useRecommendations(interests: readonly string[]) {
  const { http } = useJoutio()
  return useQuery(onboardingQueries.recommendations(http, interests))
}

/** Termine l'entrée dans l'app avec les centres d'intérêt choisis : le compte passe « onboardé » tout de suite. */
export function useCompleteOnboarding() {
  return useOptimisticMutation({
    mutationKey: onboardingKeys.mutations.complete(),
    mutationFn: (interests: readonly string[], { http }) => completeOnboarding(http, interests),
    touches: () => [meKeys.account()],
    apply: (client, interests) => changeAccount(client, { onboardingCompleted: true, interests: [...interests] }),
  })
}
