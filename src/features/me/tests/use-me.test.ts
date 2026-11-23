// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../../../core/http.js'
import type { MeView } from '../types.js'
import { useMe, useMyId, useIsPremium, usePseudonymAvailability } from '../hooks/use-me.js'

const me = {
  userId: 'u1',
  premium: true,
  avatarOptions: '{"seed":"nadia"}',
} as MeView

const http = (views: Record<string, unknown>) =>
  ({
    get: vi.fn((path: string) => Promise.resolve(views[path] ?? {})),
  }) as unknown as HttpClient

const render = <T,>(hook: () => T) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return renderHook(hook, { wrapper })
}

describe('useMe', () => {
  it('reads /api/me once and serves the account', async () => {
    const api = http({ '/api/me': me })
    const { result } = render(() => useMe(api))
    await waitFor(() => expect(result.current.data).toEqual(me))
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/api/me', expect.objectContaining({ signal: expect.anything() }))
  })

  it('serves targeted projections without a full re-render on the rest of MeView', async () => {
    const api = http({ '/api/me': me })
    const { result } = render(() => useMyId(api))
    await waitFor(() => expect(result.current.data).toBe('u1'))
  })

  it('projects the premium flag alone', async () => {
    const api = http({ '/api/me': me })
    const { result } = render(() => useIsPremium(api))
    await waitFor(() => expect(result.current.data).toBe(true))
  })
})

describe('usePseudonymAvailability', () => {
  it('does not fetch while the value is empty (skipToken)', async () => {
    const api = http({})
    const { result } = render(() => usePseudonymAvailability(api, ''))
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(api.get).not.toHaveBeenCalled()
  })
})
