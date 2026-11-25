// @vitest-environment jsdom
import { useMutation } from '@tanstack/react-query'
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, fakeHttp, fakeRealtime, renderWithJoutio } from '../../../testing/joutio.js'
import { typed } from '../../query/keys.js'
import { LIVE_NOT_FOUND, useLiveQuery, type LiveUpdate, type LiveValue } from '../use-live-query.js'

type Score = { points: number }
const DESTINATION = '/topic/live/score/u1'
const PATH = '/api/live/score/u1'
const scoreKey = (userId: string) => typed<LiveValue<Score>>()(['scores', userId, 'live'])
const score = (version: number, points = version * 10): LiveUpdate<Score> => ({
  view: 'score',
  key: 'u1',
  version,
  payload: { points },
})

function render({
  read,
  mutationKey,
  key = 'u1',
}: {
  read: () => unknown
  mutationKey?: readonly unknown[]
  key?: string | null
}) {
  const realtime = fakeRealtime()
  const http = fakeHttp({ get: read })
  const command = { current: deferred() }
  const rendered = renderWithJoutio(
    () => ({
      live: useLiveQuery({ queryKey: scoreKey('u1'), view: 'score', key, mutationKey }),
      mutation: useMutation({ mutationKey: ['scores', 'u1'], mutationFn: () => command.current.promise }),
    }),
    { http, realtime: realtime.transport },
  )
  return { ...rendered, realtime, command }
}

const points = (value: LiveValue<Score> | undefined) => value?.payload.points

describe('useLiveQuery', () => {
  it('subscribes before reading', async () => {
    const realtime = fakeRealtime()
    let subscribedFirst = false
    const http = fakeHttp({
      get: () => {
        subscribedFirst = realtime.subscribed(DESTINATION)
        return score(1)
      },
    })
    const { result } = renderWithJoutio(() => useLiveQuery({ queryKey: scoreKey('u1'), view: 'score', key: 'u1' }), {
      http,
      realtime: realtime.transport,
    })

    await waitFor(() => expect(points(result.current.data)).toBe(10))
    expect(subscribedFirst).toBe(true)
    expect(http.get).toHaveBeenCalledWith(PATH, expect.anything())
  })

  it('keeps an update received during the read when the read is older', async () => {
    const read = deferred<LiveUpdate<Score>>()
    const { result, realtime } = render({ read: () => read.promise })

    act(() => realtime.push(DESTINATION, score(3)))
    await act(async () => read.resolve(score(2)))

    await waitFor(() => expect(result.current.live.data?.version).toBe(3))
  })

  it('takes the read when it is newer than the buffered update', async () => {
    const read = deferred<LiveUpdate<Score>>()
    const { result, realtime } = render({ read: () => read.promise })

    act(() => realtime.push(DESTINATION, score(3)))
    await act(async () => read.resolve(score(4)))

    await waitFor(() => expect(result.current.live.data?.version).toBe(4))
  })

  it('applies newer updates only, whatever their order', async () => {
    const { result, realtime, http } = render({ read: () => score(2) })
    await waitFor(() => expect(result.current.live.data?.version).toBe(2))

    act(() => realtime.push(DESTINATION, score(4)))
    act(() => realtime.push(DESTINATION, score(3)))
    act(() => realtime.push(DESTINATION, score(4, 999)))
    act(() => realtime.push(DESTINATION, { ...score(9), key: 'u2' }))

    await waitFor(() => expect(result.current.live.data).toEqual(score(4)))
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('holds null while the value does not exist, then takes the first update', async () => {
    const { result, realtime } = render({
      read: () => {
        throw { statusCode: 404, type: LIVE_NOT_FOUND, message: 'not found' }
      },
    })
    await waitFor(() => expect(result.current.live.isSuccess).toBe(true))
    expect(result.current.live.data).toBeNull()

    act(() => realtime.push(DESTINATION, score(1)))

    await waitFor(() => expect(result.current.live.data).toEqual(score(1)))
  })

  it('reports any other read failure', async () => {
    const { result } = render({
      read: () => {
        throw { statusCode: 403, type: 'urn:joutio:bff:live:forbidden', message: 'forbidden' }
      },
    })

    await waitFor(() => expect(result.current.live.isError).toBe(true))
  })

  it('defers updates while a mutation of its scope runs, then applies only the latest', async () => {
    const { result, realtime, command, client } = render({ read: () => score(2), mutationKey: ['scores', 'u1'] })
    await waitFor(() => expect(result.current.live.data?.version).toBe(2))

    act(() => result.current.mutation.mutate())
    await waitFor(() => expect(result.current.mutation.isPending).toBe(true))
    act(() => realtime.push(DESTINATION, score(4)))
    act(() => realtime.push(DESTINATION, score(3)))
    expect(client.getQueryData(scoreKey('u1'))?.version).toBe(2)

    await act(async () => command.current.resolve())

    await waitFor(() => expect(result.current.live.data).toEqual(score(4)))
  })

  it('drops a deferred update that is not newer than the settled value', async () => {
    const { result, realtime, client, command } = render({ read: () => score(5), mutationKey: ['scores', 'u1'] })
    await waitFor(() => expect(result.current.live.data?.version).toBe(5))

    act(() => result.current.mutation.mutate())
    await waitFor(() => expect(result.current.mutation.isPending).toBe(true))
    // Valeur optimiste de la mutation, à la version renvoyée par la commande.
    act(() => client.setQueryData(scoreKey('u1'), score(6, 100)))
    act(() => realtime.push(DESTINATION, score(6)))
    await act(async () => command.current.resolve())
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true))

    expect(points(client.getQueryData(scoreKey('u1')))).toBe(100)
  })

  it('updates of another scope are not deferred', async () => {
    const { result, realtime } = render({ read: () => score(2), mutationKey: ['topics'] })
    await waitFor(() => expect(result.current.live.data?.version).toBe(2))

    act(() => result.current.mutation.mutate())
    await waitFor(() => expect(result.current.mutation.isPending).toBe(true))
    act(() => realtime.push(DESTINATION, score(3)))

    await waitFor(() => expect(result.current.live.data?.version).toBe(3))
  })

  it('rereads this key only on reconnection, without going back in version', async () => {
    let next = score(2)
    const { result, realtime, http } = render({ read: () => next })
    await waitFor(() => expect(result.current.live.data?.version).toBe(2))
    act(() => realtime.push(DESTINATION, score(5)))

    next = score(4)
    await act(async () => realtime.reconnect())
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2))
    expect(result.current.live.data?.version).toBe(5)

    next = score(7)
    await act(async () => realtime.reconnect())
    await waitFor(() => expect(result.current.live.data?.version).toBe(7))
  })

  it('neither reads nor subscribes without a key', () => {
    const { result, realtime, http } = render({ read: () => score(1), key: null })

    expect(realtime.subscribed(DESTINATION)).toBe(false)
    expect(http.get).not.toHaveBeenCalled()
    expect(result.current.live.data).toBeUndefined()
  })
})
