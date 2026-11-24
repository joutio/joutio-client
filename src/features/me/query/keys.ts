import { typed } from '../../../core/query/keys.js'
import type { PseudonymAvailability, RewardsView, UserRefView } from '../../profile/types.js'
import type { MeView } from '../types.js'

/** Clés du compte connecté. */
export const meKeys = {
  all: ['me'] as const,
  account: () => typed<MeView>()(['me', 'account']),
  rewards: () => typed<RewardsView>()(['me', 'rewards']),
  blocked: () => typed<UserRefView[]>()(['me', 'blocked']),
  pseudonymAvailability: (value: string) => typed<PseudonymAvailability>()(['me', 'pseudonym-availability', value]),
  mutations: {
    birthDate: () => ['me', 'birth-date'] as const,
    terms: () => ['me', 'terms'] as const,
    interests: () => ['me', 'interests'] as const,
    profile: () => ['me', 'profile'] as const,
    language: () => ['me', 'language'] as const,
    deletionCode: () => ['me', 'deletion-code'] as const,
    deletion: () => ['me', 'deletion'] as const,
  },
}
