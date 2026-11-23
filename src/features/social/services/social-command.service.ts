import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'

/** Commandes sociales : abonnements et blocage. */

/** `PUT /api/profiles/{id}/follow` : suivre un joueur. */
export async function followUser(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/follow`, { signal })
}

/** `DELETE /api/profiles/{id}/follow` : ne plus suivre un joueur. */
export async function unfollowUser(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>(`/api/profiles/${segment(userId)}/follow`, { signal })
}

/** `PUT /api/profiles/{id}/block` : bloquer un joueur (effet symétrique côté serveur). */
export async function blockUser(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/block`, { signal })
}

/** `DELETE /api/profiles/{id}/block` : débloquer. */
export async function unblockUser(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>(`/api/profiles/${segment(userId)}/block`, { signal })
}
