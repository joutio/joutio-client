// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NotificationView } from '../../features/notifications/types.js'
import { usePersonalNotifications, useRoomPresenceEvents } from '../use-personal-feed.js'
import type { RealtimeTransport } from '../transport.js'

/** Transport de test : destinations souscrites, avec déclenchement manuel de trames et de reconnexions. */
const transport = () => {
  const handlers = new Map<string, { onMessage: (message: { body: string }) => void; onReconnect?: () => void }>()
  const subscribe = vi.fn((destination: string, onMessage: (message: { body: string }) => void, onReconnect?: () => void) => {
    handlers.set(destination, { onMessage, onReconnect })
    return () => {
      handlers.delete(destination)
    }
  })
  const push = (destination: string, body: string) => handlers.get(destination)?.onMessage({ body })
  const reconnect = (destination: string) => handlers.get(destination)?.onReconnect?.()
  return { subscribe: subscribe as RealtimeTransport['subscribe'], push, reconnect, count: () => handlers.size }
}

const notification: NotificationView = {
  notificationId: 'n1',
  type: 'FOLLOW',
  actorId: 'a1',
  sourceId: null,
  topicId: null,
  gameId: null,
  expiresAt: null,
  readAt: null,
  createdAt: '2026-11-22T10:00:00Z',
}

describe('usePersonalNotifications', () => {
  it('subscribes to the personal feed and parses each notification', async () => {
    const { subscribe, push, count } = transport()
    const handler = vi.fn()
    renderHook(() => usePersonalNotifications(subscribe, 'u1', handler))
    expect(subscribe).toHaveBeenCalledWith('/topic/notifications/u1', expect.any(Function), undefined)
    act(() => push('/topic/notifications/u1', JSON.stringify({ eventType: 'FOLLOW', payload: notification })))
    expect(handler).toHaveBeenCalledWith(notification, false)
    act(() => push('/topic/notifications/u1', JSON.stringify({ eventType: 'NOTIFICATION_DELETED', payload: notification })))
    expect(handler).toHaveBeenLastCalledWith(notification, true)
    expect(count()).toBe(1)
  })

  it('does not subscribe without a session, and ignores unknown trames', () => {
    const { subscribe, push } = transport()
    const handler = vi.fn()
    const { unmount } = renderHook(() => usePersonalNotifications(subscribe, undefined, handler))
    expect(subscribe).not.toHaveBeenCalled()
    unmount()
    renderHook(() => usePersonalNotifications(subscribe, 'u1', handler))
    act(() => push('/topic/notifications/u1', '{broken'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('replays nothing on first connect and resyncs on reconnection', () => {
    const { subscribe, reconnect } = transport()
    const onResync = vi.fn()
    const handler = vi.fn()
    renderHook(() => usePersonalNotifications(subscribe, 'u1', handler, onResync))
    act(() => reconnect('/topic/notifications/u1'))
    expect(onResync).not.toHaveBeenCalled()
    act(() => reconnect('/topic/notifications/u1'))
    expect(onResync).toHaveBeenCalledTimes(1)
  })
})

describe('useRoomPresenceEvents', () => {
  it('forwards ROOM_PRESENCE frames with a roomId', () => {
    const { subscribe, push } = transport()
    const handler = vi.fn()
    renderHook(() => useRoomPresenceEvents(subscribe, 'u1', handler))
    act(() => push('/topic/notifications/u1', JSON.stringify({ eventType: 'ROOM_PRESENCE', payload: { roomId: 'r1' } })))
    expect(handler).toHaveBeenCalledWith({ roomId: 'r1' })
  })
})
