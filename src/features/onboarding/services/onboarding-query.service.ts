import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import type { TopicCardView } from '../../topics/types.js'

/** Endpoints de l'entrée dans l'app. */

export async function getRecommendations(http: HttpClient, interests: string, signal?: AbortSignalLike): Promise<TopicCardView[]> {
  return http.get<TopicCardView[]>('/api/me/onboarding/recommendations', { query: { interests }, signal })
}
