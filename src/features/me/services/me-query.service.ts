import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import type { MeView } from '../types.js'
import type { PseudonymAvailability, RewardsView, UserRefView } from '../../profile/types.js'

/** Endpoints du compte connecté (`http` injecté par l'app, comme le `axiosClient` du template). */

export async function getMe(http: HttpClient, signal?: AbortSignalLike): Promise<MeView> {
  return http.get<MeView>('/api/me', { signal })
}

export async function getRewards(http: HttpClient, signal?: AbortSignalLike): Promise<RewardsView> {
  return http.get<RewardsView>('/api/me/rewards', { signal })
}

export async function getBlockedPlayers(http: HttpClient, signal?: AbortSignalLike): Promise<UserRefView[]> {
  return http.get<UserRefView[]>('/api/me/blocked', { signal })
}

export async function checkPseudonymAvailability(
  http: HttpClient,
  value: string,
  signal?: AbortSignalLike,
): Promise<PseudonymAvailability> {
  return http.get<PseudonymAvailability>('/api/profiles/pseudonym-availability', { query: { value }, signal })
}
