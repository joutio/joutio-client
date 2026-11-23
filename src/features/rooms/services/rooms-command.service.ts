import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { IdResponse } from '../../../core/types/common.js'
import type { CreateBotRoomCommand, CreateRoomCommand, MatchmakingTicket } from '../types.js'

/** Commandes des salles et de l'appariement. */

/** Salle privée partagée par lien : `id` renvoyé. */
export async function createRoom(http: HttpClient, command: CreateRoomCommand, signal?: AbortSignalLike): Promise<IdResponse> {
  return http.post<IdResponse>('/api/rooms', { body: command, signal })
}

/** Salle d'entraînement contre le bot : `id` renvoyé. */
export async function createBotRoom(http: HttpClient, command: CreateBotRoomCommand, signal?: AbortSignalLike): Promise<IdResponse> {
  return http.post<IdResponse>('/api/rooms/bot', { body: command, signal })
}

/** Annule la salle (initiateur seulement, le serveur l'arbitre). */
export async function cancelRoom(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/rooms/${segment(roomId)}/cancel`, { signal })
}

/** Relance (« wizz ») de l'adversaire nommé absent : pur temps réel, cadence 10 s par joueur côté serveur. */
export async function wizzRoom(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/rooms/${segment(roomId)}/wizz`, { signal })
}

/** Entre dans la recherche publique d'un adversaire sur le sujet. */
export async function enqueueMatchmaking(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<MatchmakingTicket> {
  return http.post<MatchmakingTicket>('/api/matchmaking/tickets', { body: { topicId }, signal })
}

/** Annule la recherche en cours. */
export async function cancelMatchmaking(http: HttpClient, ticketId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/matchmaking/tickets/${segment(ticketId)}/cancel`, { signal })
}
