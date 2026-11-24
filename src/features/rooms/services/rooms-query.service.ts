import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { EventEnvelope } from '../../../core/realtime/stream.js'
import type { RoomView } from '../types.js'
import type { RoomEvent } from '../domain/room-event.js'
import type { MatchmakingEvent } from '../domain/matchmaking-event.js'

/** Lectures des salles et de l'appariement. */

export async function getMyRooms(http: HttpClient, signal?: AbortSignalLike): Promise<RoomView[]> {
  return http.get<RoomView[]>('/api/rooms/mine', { signal })
}

export async function getRoom(http: HttpClient, roomId: string, signal?: AbortSignalLike): Promise<RoomView> {
  return http.get<RoomView>(`/api/rooms/${segment(roomId)}`, { signal })
}

/** Historique des événements d'une salle (rejeu REST du stream). */
export async function getRoomEvents(http: HttpClient, roomId: string): Promise<EventEnvelope<RoomEvent>[]> {
  return http.get<EventEnvelope<RoomEvent>[]>(`/api/rooms/${segment(roomId)}/events`)
}

/** Historique des événements d'un ticket d'appariement (rejeu REST du stream). */
export async function getMatchmakingEvents(
  http: HttpClient,
  ticketId: string,
): Promise<EventEnvelope<MatchmakingEvent>[]> {
  return http.get<EventEnvelope<MatchmakingEvent>[]>(`/api/matchmaking/tickets/${segment(ticketId)}/events`)
}
