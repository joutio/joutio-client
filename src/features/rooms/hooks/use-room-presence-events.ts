import type { RealtimeTransport } from '../../../core/realtime/transport.js'
import { useSubscription } from '../../../core/realtime/use-subscription.js'
import type { RoomPresence } from '../types.js'

function parsePresence(body: string): RoomPresence | undefined {
  try {
    const envelope = JSON.parse(body) as { eventType?: string; payload?: RoomPresence } | null
    if (envelope?.eventType === 'ROOM_PRESENCE' && envelope.payload?.roomId) return envelope.payload
  } catch {
    // Ignore une trame illisible.
  }
  return undefined
}

/** Présence éphémère dans les salles du joueur connecté, sur son canal dédié. */
export function useRoomPresenceEvents(subscribe: RealtimeTransport['subscribe'], userId: string | undefined, handler: (presence: RoomPresence) => void) {
  useSubscription(subscribe, userId ? `/topic/room-presence/${userId}` : undefined, parsePresence, handler)
}
