// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RealtimeTransport } from '../../../core/realtime/transport.js'
import { useRoomPresenceEvents } from '../hooks/use-room-presence-events.js'

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

describe('useRoomPresenceEvents', () => {
  it('forwards ROOM_PRESENCE frames with a roomId', () => {
    const { subscribe, push } = transport()
    const handler = vi.fn()
    renderHook(() => useRoomPresenceEvents(subscribe, 'u1', handler))
    act(() => push('/topic/room-presence/u1', JSON.stringify({ eventType: 'ROOM_PRESENCE', payload: { roomId: 'r1' } })))
    expect(handler).toHaveBeenCalledWith({ roomId: 'r1' })
  })
})
