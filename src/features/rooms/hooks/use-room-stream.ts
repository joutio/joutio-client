import type { HttpClient } from '../../../core/http.js'
import type { RealtimeTransport } from '../../../core/realtime/transport.js'
import { useEventStream } from '../../../core/realtime/use-stream.js'
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
        }
      : null,
  )
}
