import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import type { ChallengeView } from '../types.js'

/** Endpoints des défis nominatifs. */

export async function getChallenges(http: HttpClient, signal?: AbortSignalLike): Promise<ChallengeView[]> {
  return http.get<ChallengeView[]>('/api/challenges/mine', { signal })
}

/** `GET /api/challenges/{id}` : un défi, relu après acceptation jusqu'à l'apparition du `roomId`. */
export async function getChallenge(http: HttpClient, challengeId: string, signal?: AbortSignalLike): Promise<ChallengeView> {
  return http.get<ChallengeView>(`/api/challenges/${encodeURIComponent(challengeId)}`, { signal })
}
