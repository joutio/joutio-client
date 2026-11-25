// @vitest-environment jsdom
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fakeRealtime, renderWithJoutio } from '../../testing/joutio.js'
import { gameKeys } from '../../features/game/query/keys.js'
import { meKeys } from '../../features/me/query/keys.js'
import { notificationKeys } from '../../features/notifications/query/keys.js'
import { roomKeys } from '../../features/rooms/query/keys.js'
import type { RoomView } from '../../features/rooms/types.js'
import { useJoutioSync } from '../personal-sync.js'

const room = (roomId: string, status: RoomView['status']) =>
  ({ roomId, status, canCancel: true, expiresAt: '2026-11-24T11:00:00Z' }) as RoomView

describe('useJoutioSync', () => {
  it('subscribes to the personal channels only with a session', () => {
    const realtime = fakeRealtime()
    renderWithJoutio(() => useJoutioSync(undefined), { realtime: realtime.transport })
    expect(realtime.subscribed('/topic/room-presence/u1')).toBe(false)
    renderWithJoutio(() => useJoutioSync('u1'), { realtime: realtime.transport })
    expect(realtime.subscribed('/topic/room-presence/u1')).toBe(true)
    expect(realtime.subscribed('/topic/notifications/u1')).toBe(true)
  })

  it('applies a room status change to my rooms, and reloads them for an unknown room', () => {
    const realtime = fakeRealtime()
    const { client } = renderWithJoutio(() => useJoutioSync('u1'), { realtime: realtime.transport })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    client.setQueryData(roomKeys.mine(), [room('r1', 'INVITED'), room('r2', 'INVITED')])

    act(() =>
      realtime.push('/topic/room-presence/u1', {
        eventType: 'ROOM_STATUS',
        payload: { roomId: 'r1', status: 'WAITING_PLAYERS', expiresAt: null, at: 'x' },
      }),
    )
    act(() =>
      realtime.push('/topic/room-presence/u1', {
        eventType: 'ROOM_STATUS',
        payload: { roomId: 'r2', status: 'DECLINED', expiresAt: null, at: 'x' },
      }),
    )
    expect(client.getQueryData(roomKeys.mine())?.map((item) => [item.roomId, item.status])).toEqual([
      ['r1', 'WAITING_PLAYERS'],
    ])
    expect(invalidate).not.toHaveBeenCalled()

    act(() =>
      realtime.push('/topic/room-presence/u1', {
        eventType: 'ROOM_STATUS',
        payload: { roomId: 'r9', status: 'INVITED', expiresAt: null, at: 'x' },
      }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: roomKeys.mine() })
  })

  it('refreshes the inbox on a notification and resynchronises after a reconnection', () => {
    const realtime = fakeRealtime()
    const { client } = renderWithJoutio(() => useJoutioSync('u1'), { realtime: realtime.transport })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    act(() =>
      realtime.push('/topic/notifications/u1', {
        eventType: 'ACCOUNT_SUSPENDED',
        payload: { notificationId: 'n1', type: 'ACCOUNT_SUSPENDED' },
      }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: notificationKeys.root })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: meKeys.account() })

    invalidate.mockClear()
    act(() => realtime.reconnect())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: roomKeys.mine() })
  })

  it('marks server-computed views stale on an achievement, without reading the game result', () => {
    const realtime = fakeRealtime()
    const { client } = renderWithJoutio(() => useJoutioSync('u1'), { realtime: realtime.transport })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    act(() => realtime.push('/topic/achievements/u1', { kind: 'BADGE', gameId: 'g1' }))
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: gameKeys.result('g1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: meKeys.account(), refetchType: 'none' })
  })
})
