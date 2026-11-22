import type { HttpClient } from '../../../http.js'
import type { RealtimeTransport } from '../../../realtime/transport.js'
import { useEventStream } from '../../../realtime/use-stream.js'
import { Room } from '../domain/room.js'
import { Matchmaking } from '../domain/matchmaking.js'
import type { RoomEvent } from '../domain/room-event.js'
import type { MatchmakingEvent } from '../domain/matchmaking-event.js'
import { getMatchmakingEvents, getRoomEvents } from '../services/rooms-query.service.js'

/**
 * Salle repliée de ses événements : historique REST à l'ouverture (et à chaque reconnexion),
 * puis STOMP seulement. `roomId` absent : aucun flux.
 */
export function useRoomStream(http: HttpClient, subscribe: RealtimeTransport['subscribe'], roomId: string | undefined) {
  return useEventStream<RoomEvent, Room>(
    roomId
      ? {
          key: `room:${roomId}`,
          initial: () => Room.empty(roomId),
          apply: (room, event) => room.onRoomEvent(event),
          source: {
            load: () => getRoomEvents(http, roomId),
            subscribe: (onFrame, onConnect) => subscribe(`/topic/rooms/${roomId}`, (message) => onFrame(message.body), onConnect),
          },
          // Salle fraîchement créée : la projection peut avoir quelques centaines de ms de retard.
          notFoundGraceMs: 5_000,
        }
      : null,
  )
}

/**
 * Recherche d'appariement repliée de ses événements : historique REST à l'ouverture, puis
 * STOMP seulement. `ticketId` absent : aucun flux.
 */
export function useMatchmakingStream(http: HttpClient, subscribe: RealtimeTransport['subscribe'], ticketId: string | undefined) {
  return useEventStream<MatchmakingEvent, Matchmaking>(
    ticketId
      ? {
          key: `matchmaking:${ticketId}`,
          initial: () => Matchmaking.empty(ticketId),
          apply: (ticket, event) => ticket.onMatchmakingEvent(event),
          source: {
            load: () => getMatchmakingEvents(http, ticketId),
            subscribe: (onFrame, onConnect) => subscribe(`/topic/matchmaking/tickets/${ticketId}`, (message) => onFrame(message.body), onConnect),
          },
          notFoundGraceMs: 5_000,
        }
      : null,
  )
}
