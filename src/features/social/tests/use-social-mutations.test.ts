// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../../../core/http.js'
import { queryKeys } from '../../../core/query/keys.js'
import { useBlockPlayer, useFollowPlayer } from '../index.js'

describe('mutations sociales', () => {
  it.each([
    ['follow', true, 'put', 'following'],
    ['follow', false, 'delete', 'following'],
    ['block', true, 'put', 'blocked'],
    ['block', false, 'delete', 'blocked'],
  ] as const)('%s=%s met à jour le cache avant la réponse et invalide sur erreur', async (action, active, method, field) => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const key = queryKeys.profiles.profile('target')
    const original = { userId: 'target', following: true, blocked: false, followersCount: 3, followingCount: 1, [field]: !active }
    client.setQueryData(key, original)
    let complete: () => void = () => undefined
    let fail: (error: Error) => void = () => undefined
    const send = vi.fn(() => new Promise<void>((resolve, reject) => {
      complete = resolve
      fail = reject
    }))
    const http = { [method]: send } as unknown as HttpClient
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
    const useAction = action === 'follow' ? useFollowPlayer : useBlockPlayer
    const { result } = renderHook(() => useAction(http, 'me', 'target'), { wrapper })

    act(() => result.current.mutate(active))
    await waitFor(() => expect(send).toHaveBeenCalledWith(`/api/profiles/target/${action}`, { signal: undefined }))
    expect(client.getQueryData(key)).toMatchObject({ [field]: active })
    await act(async () => fail(new Error('refused')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    // Optimisme natif TanStack : pas de snapshot/rollback, la vue est relue (invalidate) sur erreur.
    expect(invalidate).toHaveBeenCalled()

    invalidate.mockClear()
    send.mockClear()
    act(() => result.current.mutate(active))
    await waitFor(() => expect(http[method]).toHaveBeenCalledTimes(1))
    await act(async () => complete())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(key)).toMatchObject({ [field]: active })
    expect(invalidate).not.toHaveBeenCalled()
  })
})
