import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'

/** Commandes des sujets. */

/** `PUT /api/topics/{id}/follow` : suivre un sujet. */
export async function followTopic(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/follow`, { signal })
}

/** `DELETE /api/topics/{id}/follow` : ne plus suivre un sujet. */
export async function unfollowTopic(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>(`/api/topics/${segment(topicId)}/follow`, { signal })
}
