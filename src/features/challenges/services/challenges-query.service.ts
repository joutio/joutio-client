import type { AbortSignalLike, HttpClient } from '../../../http.js'
import type { ChallengeView } from '../types.js'

/** Endpoints des défis nominatifs. */

export async function getChallenges(http: HttpClient, signal?: AbortSignalLike): Promise<ChallengeView[]> {
  return http.get<ChallengeView[]>('/api/challenges/mine', { signal })
}
