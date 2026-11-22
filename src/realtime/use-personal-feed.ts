import { useEffect, useRef } from 'react'
import type { NotificationView } from '../features/notifications/types.js'
import type { RoomPresence } from '../features/rooms/types.js'
import type { RealtimeTransport } from './transport.js'

interface Envelope {
  eventType?: string
  payload?: NotificationView
}

/**
 * Flux personnel STOMP du joueur connecté. `handler` reçoit chaque notification créée (les suppressions
 * `NOTIFICATION_DELETED` sont transmises avec `deleted`).
 *
 * Le flux n'a pas d'historique rejouable : ce qui arrive pendant une coupure (app en arrière-plan, réseau) est perdu.
 * `onResync` est donc rappelé à chaque **re**connexion (jamais à la première) pour relire les vues qui en dépendent.
 */
export function usePersonalNotifications(
  subscribe: RealtimeTransport['subscribe'],
  userId: string | undefined,
  handler: (notification: NotificationView, deleted: boolean) => void,
  onResync?: () => void,
) {
  const ref = useRef(handler)
  ref.current = handler
  const resync = useRef(onResync)
  resync.current = onResync
  const wantsResync = onResync !== undefined
  useEffect(() => {
    if (!userId) return
    let connected = false
    const onConnect = () => {
      if (connected) resync.current?.()
      connected = true
    }
    return subscribe(
      `/topic/notifications/${userId}`,
      (message) => {
        let envelope: Envelope
        try {
          envelope = JSON.parse(message.body) as Envelope
        } catch {
          return
        }
        if (!envelope.payload?.notificationId) return
        ref.current(envelope.payload, envelope.eventType === 'NOTIFICATION_DELETED')
      },
      wantsResync ? onConnect : undefined,
    )
  }, [subscribe, userId, wantsResync])
}

/**
 * Présence d'un joueur dans un de mes salons (`ROOM_PRESENCE`, éphémère, hors inbox, 2026-11-16) : poussée sur le
 * même flux personnel, sans `notificationId`.
 */
export function useRoomPresenceEvents(subscribe: RealtimeTransport['subscribe'], userId: string | undefined, handler: (presence: RoomPresence) => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!userId) return
    return subscribe(`/topic/notifications/${userId}`, (message) => {
      let envelope: { eventType?: string; payload?: RoomPresence }
      try {
        envelope = JSON.parse(message.body) as typeof envelope
      } catch {
        return
      }
      if (envelope.eventType === 'ROOM_PRESENCE' && envelope.payload?.roomId) ref.current(envelope.payload)
    })
  }, [subscribe, userId])
}
