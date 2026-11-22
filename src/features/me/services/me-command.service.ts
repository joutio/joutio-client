import type { AbortSignalLike, HttpClient } from '../../../http.js'
import { segment } from '../../../http.js'
import type { MeView } from '../types.js'
import type { Language } from '../../../types/common.js'

/** Commandes du compte connecté. */

/** `PUT /api/me/birth-date` : date de naissance privée. */
export async function setBirthDate(http: HttpClient, birthDate: string, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>('/api/me/birth-date', { body: { birthDate }, signal })
}

/** `PUT /api/me/terms` : acceptation des CGU en vigueur. */
export async function acceptTerms(http: HttpClient, version: string, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>('/api/me/terms', { body: { version }, signal })
}

/** `PUT /api/me/interests` : centres d'intérêt (codes d'univers ordonnés, 3 au plus). */
export async function updateInterests(http: HttpClient, interests: readonly string[], signal?: AbortSignalLike): Promise<void> {
  return http.put<void>('/api/me/interests', { body: { interests }, signal })
}

/** `PUT /api/me` : édition du profil (pseudonyme, bio, pays). */
export async function updateProfile(http: HttpClient, command: { pseudonym: string; bio: string; country: string | null }, signal?: AbortSignalLike): Promise<MeView> {
  return http.put<MeView>('/api/me', { body: command, signal })
}

/** `DELETE /api/me` : suppression du compte, avec le code reçu par e-mail. */
export async function deleteAccount(http: HttpClient, code: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>('/api/me', { body: { code }, signal })
}

/** `POST /api/me/deletion-code` : demande du code de suppression. */
export async function requestDeletionCode(http: HttpClient, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>('/api/me/deletion-code', { signal })
}

/** `PUT /api/profiles/{id}/language` : langue du compte. */
export async function updateLanguage(http: HttpClient, userId: string, language: Language, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/profiles/${segment(userId)}/language`, { body: { language }, signal })
}

