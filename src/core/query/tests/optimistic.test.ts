// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query'
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import { isClientError, shouldRetry } from '../client.js'
import { typed } from '../keys.js'
import { changeFields, removeFrom } from '../optimistic.js'
import { PartialFailure, useOptimisticBatch } from '../use-optimistic-mutation.js'

const key = typed<{ name: string; count: number }>()(['thing'])

describe('query policy', () => {
  it('never retries a 4xx, retries a network or server error once', () => {
    expect(isClientError({ statusCode: 409 })).toBe(true)
    expect(shouldRetry(0, { statusCode: 404 })).toBe(false)
    expect(shouldRetry(0, { statusCode: 503 })).toBe(true)
    expect(shouldRetry(0, new Error('network'))).toBe(true)
    expect(shouldRetry(1, new Error('network'))).toBe(false)
  })
})

describe('changeFields', () => {
  it('undoes only the fields it wrote, and only if nobody changed them since', () => {
    const client = new QueryClient()
    client.setQueryData(key, { name: 'a', count: 1 })
    const undoName = changeFields(client, key, { name: 'b' })
    changeFields(client, key, { count: 2 })

    undoName()
    expect(client.getQueryData(key)).toEqual({ name: 'a', count: 2 })

    const undoAgain = changeFields(client, key, { name: 'c' })
    client.setQueryData(key, { name: 'd', count: 2 })
    undoAgain()
    expect(client.getQueryData(key)).toEqual({ name: 'd', count: 2 })
  })
})

describe('removeFrom', () => {
  it('puts removed items back at their place, unless they came back meanwhile', () => {
    const removal = removeFrom(['a', 'b', 'c'], (item) => item === 'b')
    expect(removal.items).toEqual(['a', 'c'])
    expect(removal.restore(['a', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd'])
    expect(removal.restore(['b', 'a'])).toEqual(['b', 'a'])
  })
})

describe('useOptimisticBatch', () => {
  it('rolls back only the refused items of a partial failure', async () => {
    const list = typed<string[]>()(['list'])
    const pending = deferred()
    const http = fakeHttp({ post: (path) => (path === 'b' ? Promise.reject(new Error('refused')) : pending.promise) })
    const { result, client } = renderWithJoutio(
      () =>
        useOptimisticBatch({
          mutationKey: ['batch'],
          run: (id, { http: runtime }) => runtime.post(id),
          touches: () => [list],
          apply: (queryClient, id) => {
            queryClient.setQueryData(list, (items) => items?.filter((item) => item !== id))
            return () => queryClient.setQueryData(list, (items) => (items ? [...items, id].sort() : items))
          },
        }),
      { http },
    )
    client.setQueryData(list, ['a', 'b', 'c'])

    act(() => result.current.mutate(['a', 'b']))
    await waitFor(() => expect(client.getQueryData(list)).toEqual(['c']))
    await act(async () => pending.resolve())

    await waitFor(() => expect(result.current.error).toBeInstanceOf(PartialFailure))
    expect((result.current.error as PartialFailure).failed).toEqual(['b'])
    expect(client.getQueryData(list)).toEqual(['b', 'c'])
  })
})
