// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import type { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { PartialFailure } from '../../../core/query/use-optimistic-mutation.js'
import { deferred, fakeHttp, NOW, renderWithJoutio } from '../../../testing/joutio.js'
import { useAcceptInvitation, useDeclineInvitations, useRemindRoom } from '../hooks/use-room-mutations.js'
import { roomKeys } from '../query/keys.js'
import type { RoomView } from '../types.js'

const room = (roomId: string, overrides: Partial<RoomView> = {}) =>
  ({
    roomId,
    status: 'INVITED',
    canCancel: false,
    remindableAt: null,
    expiresAt: '2026-11-24T11:00:00Z',
    ...overrides,
  }) as RoomView

const mine = (rooms: RoomView[]) => ({ view: 'my-rooms', key: 'u1', version: 1, payload: rooms })
const rooms = (client: QueryClient) => client.getQueryData(roomKeys.mine('u1'))?.payload

describe('room mutations', () => {
  it('accepting moves the invitation to the waiting rooms before the response', async () => {
    const pending = deferred()
    const { result, client, http } = renderWithJoutio(() => useAcceptInvitation(), {
      http: fakeHttp({ post: () => pending.promise }),
    })
    client.setQueryData(roomKeys.mine('u1'), mine([room('r1')]))

    act(() => result.current.mutate('r1'))
    await waitFor(() => expect(rooms(client)?.[0]?.status).toBe('WAITING_PLAYERS'))
    expect(http.post).toHaveBeenCalledWith('/api/rooms/r1/accept', { signal: undefined })

    await act(async () => pending.reject(new Error('expired')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(rooms(client)?.[0]?.status).toBe('INVITED')
  })

  it('declining a batch keeps the refusals the server accepted and brings back the others', async () => {
    const http = fakeHttp({ post: (path) => (path.includes('r2') ? Promise.reject(new Error('gone')) : undefined) })
    const { result, client } = renderWithJoutio(() => useDeclineInvitations(), { http })
    client.setQueryData(roomKeys.mine('u1'), mine([room('r1'), room('r2'), room('r3')]))

    act(() => result.current.mutate(['r1', 'r2']))
    await waitFor(() => expect(result.current.error).toBeInstanceOf(PartialFailure))
    expect(rooms(client)?.map((item) => item.roomId)).toEqual(['r2', 'r3'])
  })

  it('reminding a sent invitation pushes the next reminder 10 minutes away', async () => {
    const { result, client } = renderWithJoutio(() => useRemindRoom(), { http: fakeHttp() })
    client.setQueryData(roomKeys.mine('u1'), mine([room('r1', { canCancel: true })]))

    act(() => result.current.mutate('r1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(rooms(client)?.[0]?.remindableAt).toBe(new Date(NOW + 10 * 60 * 1000).toISOString())
  })
})
