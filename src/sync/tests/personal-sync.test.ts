// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LIVE_NOT_FOUND } from '../../core/realtime/use-live-query.js'
import { fakeHttp, fakeRealtime, renderWithJoutio } from '../../testing/joutio.js'
import { gameKeys } from '../../features/game/query/keys.js'
import { meKeys } from '../../features/me/query/keys.js'
import { notificationKeys } from '../../features/notifications/query/keys.js'
import { roomKeys } from '../../features/rooms/query/keys.js'
import type { RoomView } from '../../features/rooms/types.js'
import { useJoutioSync } from '../personal-sync.js'

const room = (roomId: string, status: RoomView['status']) =>
  ({ roomId, status, canCancel: true, expiresAt: '2026-11-24T11:00:00Z' }) as RoomView
const MY_ROOMS = '/topic/live/my-rooms/u1'
const mine = (version: number, rooms: RoomView[]) => ({ view: 'my-rooms', key: 'u1', version, payload: rooms })
const noRooms = () => fakeHttp({ get: () => Promise.reject({ type: LIVE_NOT_FOUND }) })

describe('useJoutioSync', () => {
  it('subscribes to the personal channels only with a session', () => {
    const realtime = fakeRealtime()
    renderWithJoutio(() => useJoutioSync(undefined), { http: noRooms(), realtime: realtime.transport })
    expect(realtime.subscribed(MY_ROOMS)).toBe(false)
    renderWithJoutio(() => useJoutioSync('u1'), { http: noRooms(), realtime: realtime.transport })
    expect(realtime.subscribed(MY_ROOMS)).toBe(true)
    expect(realtime.subscribed('/topic/notifications/u1')).toBe(true)
  })

  it('rereads the active games when a room leaves my rooms', async () => {
    const realtime = fakeRealtime()
    const { client } = renderWithJoutio(() => useJoutioSync('u1'), { http: noRooms(), realtime: realtime.transport })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    act(() => realtime.push(MY_ROOMS, mine(1, [room('r1', 'INVITED'), room('r2', 'INVITED')])))
    act(() => realtime.push(MY_ROOMS, mine(2, [room('r1', 'WAITING_PLAYERS'), room('r2', 'INVITED')])))
    await waitFor(() => expect(client.getQueryData(roomKeys.mine('u1'))?.version).toBe(2))
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: gameKeys.actives() })

    act(() => realtime.push(MY_ROOMS, mine(3, [room('r2', 'INVITED')])))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: gameKeys.actives() }))
  })

  it('refreshes the inbox on a notification and resynchronises after a reconnection', () => {
    const realtime = fakeRealtime()
    const { client } = renderWithJoutio(() => useJoutioSync('u1'), { http: noRooms(), realtime: realtime.transport })
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
    expect(invalidate).toHaveBeenCalledWith({ queryKey: notificationKeys.root })
  })

  it('marks server-computed views stale on an achievement, without reading the game result', () => {
    const realtime = fakeRealtime()
    const { client } = renderWithJoutio(() => useJoutioSync('u1'), { http: noRooms(), realtime: realtime.transport })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    act(() => realtime.push('/topic/achievements/u1', { kind: 'BADGE', gameId: 'g1' }))
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: gameKeys.result('g1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: meKeys.account(), refetchType: 'none' })
  })
})
