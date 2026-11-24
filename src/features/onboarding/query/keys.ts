import { typed } from '../../../core/query/keys.js'
import type { TopicCardView } from '../../topics/types.js'

export const onboardingKeys = {
  recommendations: (interests: readonly string[]) =>
    typed<TopicCardView[]>()(['onboarding', 'recommendations', [...interests]]),
  mutations: {
    complete: () => ['onboarding', 'complete'] as const,
  },
}
