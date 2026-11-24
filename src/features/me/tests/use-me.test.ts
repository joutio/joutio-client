// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import { profileKeys } from '../../profile/query/keys.js'
import type { PlayerProfileView } from '../../profile/types.js'
import { useIsPremium, useMe, useMyId, usePseudonymAvailability } from '../hooks/use-me.js'
import { useUpdateMyProfile } from '../hooks/use-me-mutations.js'
import { meKeys } from '../query/keys.js'
import type { MeView } from '../types.js'

const me = {
  userId: 'u1',
  pseudonym: 'Nadia',
  bio: null,
  country: null,
  premium: true,
  avatarOptions: '{"seed":"nadia"}',
} as MeView
const reads = (views: Record<string, unknown>) => fakeHttp({ get: (path) => views[path] ?? {} })

describe('useMe', () => {
  it('reads /api/me once and serves the account', async () => {
    const http = reads({ '/api/me': me })
    const { result } = renderWithJoutio(() => useMe(), { http })
    await waitFor(() => expect(result.current.data).toEqual(me))
    expect(http.get).toHaveBeenCalledTimes(1)
    expect(http.get).toHaveBeenCalledWith('/api/me', expect.objectContaining({ signal: expect.anything() }))
  })

  it('serves targeted projections of the same read', async () => {
    const http = reads({ '/api/me': me })
    const { result } = renderWithJoutio(() => ({ id: useMyId().data, premium: useIsPremium().data }), { http })
    await waitFor(() => expect(result.current).toEqual({ id: 'u1', premium: true }))
    expect(http.get).toHaveBeenCalledTimes(1)
  })
})

describe('usePseudonymAvailability', () => {
  it('does not fetch while the value is empty', async () => {
    const http = reads({})
    const { result } = renderWithJoutio(() => usePseudonymAvailability(''), { http })
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(http.get).not.toHaveBeenCalled()
  })
})

describe('useUpdateMyProfile', () => {
  it('changes the account and the public profile at once, then keeps the account returned by the server', async () => {
    const pending = deferred<MeView>()
    const http = fakeHttp({ put: () => pending.promise })
    const { result, client } = renderWithJoutio(() => useUpdateMyProfile('u1'), { http })
    client.setQueryData(meKeys.account(), me)
    client.setQueryData(profileKeys.detail('u1'), {
      userId: 'u1',
      pseudonym: 'Nadia',
      bio: null,
      country: null,
    } as PlayerProfileView)

    act(() => result.current.mutate({ pseudonym: 'Nadja', bio: 'Salut', country: 'FR' }))
    await waitFor(() =>
      expect(client.getQueryData(meKeys.account())).toMatchObject({ pseudonym: 'Nadja', bio: 'Salut', country: 'FR' }),
    )
    expect(client.getQueryData(profileKeys.detail('u1'))).toMatchObject({ pseudonym: 'Nadja' })

    await act(async () => pending.resolve({ ...me, pseudonym: 'Nadja', bio: 'Salut', country: 'FR', premium: false }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(meKeys.account())?.premium).toBe(false)
    expect(http.get).not.toHaveBeenCalled()
  })
})
