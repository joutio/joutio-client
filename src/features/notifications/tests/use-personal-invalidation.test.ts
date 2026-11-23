// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { queryKeys } from '../../../core/query/keys.js'
import type { RealtimeTransport } from '../../../core/realtime/transport.js'
import { usePersonalInvalidation } from '../index.js'

it('ne rafraîchit que l’inbox lors d’une suppression et resynchronise à la reconnexion', () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const listeners = new Map<string, { onMessage: (message: { body: string }) => void; onConnect?: () => void }>()
  const subscribe: RealtimeTransport['subscribe'] = (destination, onMessage, onConnect) => {
    listeners.set(destination, { onMessage, onConnect })
    return () => { listeners.delete(destination) }
  }
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  const { rerender } = renderHook(({ userId }) => usePersonalInvalidation(subscribe, userId), {
    initialProps: { userId: 'me' },
    wrapper,
  })

  const feed = listeners.get('/topic/notifications/me')!
  act(() => feed.onConnect?.())
  expect(invalidate).not.toHaveBeenCalled()
  act(() => feed.onMessage({ body: JSON.stringify({ eventType: 'NOTIFICATION_DELETED', payload: { notificationId: 'n1' } }) }))
  expect(invalidate.mock.calls).toEqual([[{ queryKey: queryKeys.notifications.all() }]])
  act(() => feed.onConnect?.())
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.myRooms() })

  rerender({ userId: 'another' })
  expect([...listeners.keys()]).toEqual(['/topic/notifications/another', '/topic/achievements/another'])
})
