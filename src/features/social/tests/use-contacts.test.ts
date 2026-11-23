// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import type { HttpClient } from '../../../core/http.js'
import type { PeopleSort } from '../../profile/types.js'
import { useContacts } from '../hooks/use-contacts.js'
import type { ContactDirection } from '../types.js'

it('garde la liste pendant un tri du même joueur et efface le résultat lors d’un changement de liste', async () => {
  const client = new QueryClient()
  const get = vi.fn().mockResolvedValueOnce({ content: [], page: 0, last: true }).mockImplementation(() => new Promise(() => {}))
  const http = { get } as unknown as HttpClient
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  const initialProps: { userId: string | undefined; direction: ContactDirection; sort: PeopleSort } =
    { userId: 'a', direction: 'followers', sort: 'ALPHA' }
  const { result, rerender } = renderHook(
    ({ userId, direction, sort }) => useContacts(http, userId, direction, '', sort),
    { initialProps, wrapper },
  )

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  rerender({ ...initialProps, sort: 'RECENT' })
  expect(result.current.isPlaceholderData).toBe(true)
  rerender({ ...initialProps, direction: 'following' })
  expect(result.current.data).toBeUndefined()
  rerender({ ...initialProps, userId: 'b' })
  expect(result.current.data).toBeUndefined()
  const calls = get.mock.calls.length
  rerender({ ...initialProps, userId: undefined })
  expect(result.current.data).toBeUndefined()
  expect(get).toHaveBeenCalledTimes(calls)
})
