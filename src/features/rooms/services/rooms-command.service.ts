import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { IdResponse } from '../../../core/types/common.js'
import type { CreateBotRoomCommand, CreateChallengeCommand, CreateRoomCommand, MatchmakingTicket } from '../types.js'

/** Commandes des salles (défis compris) et de l'appariement. */

/** Défi, ou revanche avec `gameId` : la salle naît `INVITED`, son `id` est renvoyé. */
export async function createChallenge(
  http: HttpClient,
  command: CreateChallengeCommand,
  signal?: AbortSignalLike,
): Promise<IdResponse> {
  return http.post<IdResponse>('/api/rooms/challenge', { body: command, signal })
}

/** Salon partagé par lien : `id` renvoyé. */
export async function createRoom(
  http: HttpClient,
  command: CreateRoomCommand,
  signal?: AbortSignalLike,
): Promise<IdResponse> {
  return http.post<IdResponse>('/api/rooms', { body: command, signal })
}

/** Salle d'entraînement contre le bot : `id` renvoyé. */
export async function createBotRoom(
  http: HttpClient,
  command: CreateBotRoomCommand,
  signal?: AbortSignalLike,
): Promise<IdResponse> {
  return http.post<IdResponse>('/api/rooms/bot', { body: command, signal })
}

/** L'invité accepte le défi : la salle s'ouvre aux deux joueurs. */
export async function acceptInvitation(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/rooms/${segment(roomId)}/accept`, { signal })
}

/** L'invité refuse le défi. */
export async function declineInvitation(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/rooms/${segment(roomId)}/decline`, { signal })
}

/** Annule la salle, invitation comprise (initiateur seulement, le serveur l'arbitre). */
export async function cancelRoom(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/rooms/${segment(roomId)}/cancel`, { signal })
}

/** Relance : invitation renvoyée (10 min) ou adversaire absent appelé (10 s), selon l'étape de la salle. */
export async function remindRoom(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/rooms/${segment(roomId)}/remind`, { signal })
}

/** Entre dans la recherche publique d'un adversaire sur le sujet. */
export async function enqueueMatchmaking(
  http: HttpClient,
  topicId: string,
  signal?: AbortSignalLike,
): Promise<MatchmakingTicket> {
  return http.post<MatchmakingTicket>('/api/matchmaking/tickets', { body: { topicId }, signal })
}

/** Annule la recherche en cours. */
export async function cancelMatchmaking(http: HttpClient, ticketId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/matchmaking/tickets/${segment(ticketId)}/cancel`, { signal })
}
