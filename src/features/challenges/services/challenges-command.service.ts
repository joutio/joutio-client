import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { IdResponse } from '../../../core/types/common.js'
import type { ChallengeView, ChallengeCommand } from '../types.js'

/** Commandes des défis nominatifs. */

/** Défi nominatif envoyé à `opponentId` sur un sujet : `id` du défi renvoyé. */
export async function createChallenge(http: HttpClient, command: ChallengeCommand, signal?: AbortSignalLike): Promise<IdResponse> {
  return http.post<IdResponse>('/api/challenges', { body: command, signal })
}

/** Accepte un défi reçu : la salle est créée par le serveur. */
export async function acceptChallenge(http: HttpClient, challengeId: string, signal?: AbortSignalLike): Promise<ChallengeView> {
  return http.post<ChallengeView>(`/api/challenges/${segment(challengeId)}/accept`, { signal })
}

/** Décline un défi reçu. */
export async function declineChallenge(http: HttpClient, challengeId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/challenges/${segment(challengeId)}/decline`, { signal })
}

/** Annule un défi envoyé encore en attente. */
export async function cancelChallenge(http: HttpClient, challengeId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/challenges/${segment(challengeId)}/cancel`, { signal })
}

/** Relance un défi envoyé (cadence serveur, `remindableAt`). */
export async function remindChallenge(http: HttpClient, challengeId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/challenges/${segment(challengeId)}/remind`, { signal })
}

