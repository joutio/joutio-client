import type { RealtimeTransport } from '../../../core/realtime/transport.js'
import { useSubscription } from '../../../core/realtime/use-subscription.js'
import type { NotificationView, PersonalNotificationEvent } from '../types.js'

function readEvent(body: string): PersonalNotificationEvent | undefined {
  try {
    const frame = JSON.parse(body) as { eventType?: string; payload?: Partial<NotificationView> } | null
    const payload = frame?.payload
    if (typeof payload?.notificationId !== 'string' || !payload.notificationId) return
    if (frame?.eventType === 'NOTIFICATION_DELETED') return { type: 'deleted', notificationId: payload.notificationId }
    if (payload.type && frame?.eventType === payload.type) return { type: 'created', notification: payload as NotificationView }
  } catch {
    // Ignore une trame illisible.
  }
  return undefined
}

/**
 * Le flux de l'inbox est éphémère. Seules les reconnexions déclenchent une resynchronisation
 * (`onResync`). `userId` absent : aucun abonnement.
 */
export function usePersonalNotifications(
  subscribe: RealtimeTransport['subscribe'],
  userId: string | undefined,
  handler: (event: PersonalNotificationEvent) => void,
  onResync?: () => void,
) {
  useSubscription(subscribe, userId ? `/topic/notifications/${userId}` : undefined, readEvent, handler, onResync)
}
