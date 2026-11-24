import { useJoutio } from '../../../core/runtime/context.js'
import { useEventStream } from '../../../core/realtime/use-stream.js'
import { parseEnvelope, useSubscription } from '../../../core/realtime/use-subscription.js'
import { Room } from '../domain/room.js'
import { Matchmaking } from '../domain/matchmaking.js'
import type { RoomEvent } from '../domain/room-event.js'
import type { MatchmakingEvent } from '../domain/matchmaking-event.js'
import type { JoinRefusal } from '../types.js'
import { getMatchmakingEvents, getRoomEvents } from '../services/rooms-query.service.js'

/**
 * Salle repliée de ses événements : historique REST à l'ouverture (et à chaque reconnexion), puis STOMP. Sert aussi à
 * attendre la réponse à une revanche : `INVITED`, puis `WAITING_PLAYERS` (acceptée) ou `DECLINED`/`EXPIRED`.
 */
export function useRoomStream(roomId: string | undefined) {
  const { http, realtime } = useJoutio()
  return useEventStream<RoomEvent, Room>(
    roomId
      ? {
          key: `room:${roomId}`,
          initial: () => Room.empty(roomId),
          apply: (room, event) => room.onRoomEvent(event),
          source: {
            load: () => getRoomEvents(http, roomId),
            subscribe: (onFrame, onConnect) =>
              realtime.subscribe(`/topic/rooms/${roomId}`, (message) => onFrame(message.body), onConnect),
          },
        }
      : null,
  )
}

/** Recherche d'appariement repliée de ses événements : historique REST à l'ouverture, puis STOMP. */
export function useMatchmakingStream(ticketId: string | undefined) {
  const { http, realtime } = useJoutio()
  return useEventStream<MatchmakingEvent, Matchmaking>(
    ticketId
      ? {
          key: `matchmaking:${ticketId}`,
          initial: () => Matchmaking.empty(ticketId),
          apply: (ticket, event) => ticket.onMatchmakingEvent(event),
          source: {
            load: () => getMatchmakingEvents(http, ticketId),
            subscribe: (onFrame, onConnect) =>
              realtime.subscribe(
                `/topic/matchmaking/tickets/${ticketId}`,
                (message) => onFrame(message.body),
                onConnect,
              ),
          },
        }
      : null,
  )
}

/** Refus d'entrée d'après le type du problème poussé par le BFF. */
export function joinRefusalOf(problemType: string | undefined): JoinRefusal {
  if (problemType === 'urn:joutio:room:alreadyFull') return 'FULL'
  if (problemType === 'urn:joutio:room:notInvited' || problemType === 'urn:joutio:room:invitationPending')
    return 'NOT_INVITED'
  if (problemType === 'urn:joutio:room:notFound' || problemType === 'urn:joutio:room:notAvailable') return 'GONE'
  return 'UNAVAILABLE'
}

function parseRefusal(body: string): { roomId: string; refusal: JoinRefusal } | undefined {
  const frame = parseEnvelope(body) as { roomId?: unknown; problem?: { type?: unknown } } | undefined
  if (typeof frame?.roomId !== 'string') return undefined
  return {
    roomId: frame.roomId,
    refusal: joinRefusalOf(typeof frame.problem?.type === 'string' ? frame.problem.type : undefined),
  }
}

/**
 * Refus d'entrée dans un salon (`/user/queue/room-presence`) : salle pleine, joueur non invité ou défi pas encore
 * accepté, joueur ou sujet indisponible, salle disparue. `roomId` absent : aucun abonnement.
 */
export function useJoinRefusal(roomId: string | undefined, onRefusal: (refusal: JoinRefusal) => void) {
  useSubscription(roomId ? '/user/queue/room-presence' : undefined, parseRefusal, (event) => {
    if (event.roomId === roomId) onRefusal(event.refusal)
  })
}
