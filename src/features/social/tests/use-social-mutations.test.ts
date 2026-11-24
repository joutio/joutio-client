// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { deferred, fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import { profileKeys } from '../../profile/query/keys.js'
import type { PlayerProfileView } from '../../profile/types.js'
import { useBlockPlayer, useFollowPlayer } from '../hooks/use-social-mutations.js'

describe('social mutations', () => {
  it.each([
    ['follow', true, 'put', 'following'],
    ['follow', false, 'delete', 'following'],
    ['block', true, 'put', 'blocked'],
    ['block', false, 'delete', 'blocked'],
  ] as const)(
    '%s=%s shows the change before the response, rolls it back on error, never reads after success',
    async (action, active, method, field) => {
      let pending = deferred()
      const http = fakeHttp({ [method]: () => pending.promise })
      const { result, client } = renderWithJoutio(
        () => (action === 'follow' ? useFollowPlayer('me', 'target') : useBlockPlayer('me', 'target')),
        { http },
      )
      const cancel = vi.spyOn(client, 'cancelQueries')
      const original = {
        userId: 'target',
        following: !active,
        blocked: !active,
        followersCount: 3,
        followingCount: 1,
      } as PlayerProfileView
      client.setQueryData(profileKeys.detail('target'), original)

      act(() => result.current.mutate(active))
      await waitFor(() =>
        expect(http[method]).toHaveBeenCalledWith(`/api/profiles/target/${action}`, { signal: undefined }),
      )
      expect(cancel).toHaveBeenCalled()
      expect(client.getQueryData(profileKeys.detail('target'))).toMatchObject({ [field]: active })

      await act(async () => pending.reject(new Error('refused')))
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(client.getQueryData(profileKeys.detail('target'))).toMatchObject({ [field]: !active })

      pending = deferred()
      act(() => result.current.mutate(active))
      await act(async () => pending.resolve())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(client.getQueryData(profileKeys.detail('target'))).toMatchObject({ [field]: active })
      expect(http.get).not.toHaveBeenCalled()
    },
  )
})
