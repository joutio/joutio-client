import { skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import { getMyRooms, getRoom } from '../services/rooms-query.service.js'

/** Clés React Query des salles, exportées pour les écritures transversales (`queryKeys`). */
export const roomsKeys = {
  /** Salles du joueur (`/api/rooms/mine`) : Défis, sa pastille et la reprise de partie. */
  myRooms: () => ['rooms', 'mine'] as const,
  /** Un salon (`/api/rooms/{id}`). */
  room: (roomId: string) => ['rooms', 'room', roomId] as const,
}

/** Clés React Query de l'appariement. */
export const matchmakingKeys = {
  /** Ticket de recherche en cours du joueur. */
  ticket: (ticketId: string) => ['matchmaking', 'ticket', ticketId] as const,
}

/** Salles du joueur (Défis, pastille, reprise de partie). */
export function useMyRooms(http: HttpClient) {
  return useQuery({ queryKey: roomsKeys.myRooms(), queryFn: ({ signal }) => getMyRooms(http, signal) })
}

/** Un salon (vue REST). */
export function useRoom(http: HttpClient, roomId: string | undefined) {
  return useQuery({
    queryKey: roomsKeys.room(roomId ?? ''),
    queryFn: roomId ? ({ signal }) => getRoom(http, roomId, signal) : skipToken,
  })
}
