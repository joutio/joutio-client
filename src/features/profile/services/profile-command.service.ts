import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { Language } from '../../../core/types/common.js'

/** Commandes du profil public. */

/** `PUT /api/profiles/{id}/pseudonym`. */
export async function updatePseudonym(
  http: HttpClient,
  userId: string,
  pseudonym: string,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/pseudonym`, { body: { pseudonym }, signal })
}

/** `PUT /api/profiles/{id}/bio` : `null` efface. */
export async function updateBio(
  http: HttpClient,
  userId: string,
  bio: string | null,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/bio`, { body: { bio }, signal })
}

/** `PUT /api/profiles/{id}/country` : `null` = non renseigné. */
export async function updateCountry(
  http: HttpClient,
  userId: string,
  country: string | null,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/country`, { body: { country }, signal })
}

/** `PUT /api/profiles/{id}/banner` : `null` efface. */
export async function updateBanner(
  http: HttpClient,
  userId: string,
  bannerUrl: string | null,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/banner`, { body: { bannerUrl }, signal })
}

/** `PUT /api/profiles/{id}/language`. */
export async function updateProfileLanguage(
  http: HttpClient,
  userId: string,
  language: Language,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/language`, { body: { language }, signal })
}

/** `PUT /api/profiles/{id}/avatar-options` : `null` = avatar de base. */
export async function updateAvatarOptions(
  http: HttpClient,
  userId: string,
  avatarOptions: string | null,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/avatar-options`, { body: { avatarOptions }, signal })
}

/** `PUT /api/profiles/{id}/title` : porte un titre (`topicId:TIER`) ou le retire (`null`). */
export async function updateProfileTitle(
  http: HttpClient,
  userId: string,
  titleKey: string | null,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/title`, { body: { titleKey }, signal })
}
