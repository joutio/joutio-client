// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import {
  useReadNotification,
  useRemoveAllNotifications,
  useRemoveNotification,
} from '../hooks/use-notification-mutations.js'
import { notificationKeys } from '../query/keys.js'
import type { NotificationView } from '../types.js'

const notification = (notificationId: string, readAt: string | null) => ({ notificationId, readAt }) as NotificationView
const inbox = (...content: NotificationView[]) => ({
  pageParams: [0],
  pages: [{ content, page: 0, size: 10, totalElements: content.length, totalPages: 1, first: true, last: true }],
})

describe('notification mutations', () => {
  it('reading drops the badge at once and restores it on error', async () => {
    const pending = deferred()
    const { result, client } = renderWithJoutio(() => useReadNotification(), {
      http: fakeHttp({ post: () => pending.promise }),
    })
    client.setQueryData(notificationKeys.list(), inbox(notification('n1', null), notification('n2', null)))
    client.setQueryData(notificationKeys.unreadCount(), { count: 2 })

    act(() => result.current.mutate('n1'))
    await waitFor(() => expect(client.getQueryData(notificationKeys.unreadCount())).toEqual({ count: 1 }))
    expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content[0]?.readAt).not.toBeNull()

    await act(async () => pending.reject(new Error('refused')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(notificationKeys.unreadCount())).toEqual({ count: 2 })
    expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content[0]?.readAt).toBeNull()
  })

  it('removing puts the notification back at its place on error', async () => {
    const pending = deferred()
    const { result, client } = renderWithJoutio(() => useRemoveNotification(), {
      http: fakeHttp({ delete: () => pending.promise }),
    })
    client.setQueryData(
      notificationKeys.list(),
      inbox(notification('n1', 'x'), notification('n2', 'x'), notification('n3', 'x')),
    )

    act(() => result.current.mutate('n2'))
    await waitFor(() => expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content).toHaveLength(2))
    await act(async () => pending.reject(new Error('refused')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content.map((item) => item.notificationId)).toEqual([
      'n1',
      'n2',
      'n3',
    ])
  })
})

describe('useRemoveAllNotifications', () => {
  it('empties the inbox and the badge before the answer, cancels reads in flight and reads nothing after', async () => {
    const pending = deferred()
    const http = fakeHttp({ delete: () => pending.promise, get: () => new Promise(() => undefined) })
    const { result, client } = renderWithJoutio(() => useRemoveAllNotifications(), { http })
    client.setQueryData(notificationKeys.list(), inbox(notification('n1', null), notification('n2', 'x')))
    client.setQueryData(notificationKeys.unreadCount(), { count: 1 })
    void client.prefetchQuery({ queryKey: notificationKeys.unreadCount(), queryFn: () => new Promise(() => undefined) })

    act(() => result.current.mutate())
    await waitFor(() => expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content).toEqual([]))
    expect(client.getQueryData(notificationKeys.unreadCount())).toEqual({ count: 0 })
    expect(client.getQueryState(notificationKeys.unreadCount())?.fetchStatus).toBe('idle')
    expect(http.delete).toHaveBeenCalledWith('/api/notifications', { signal: undefined })

    await act(async () => pending.resolve())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content).toEqual([])
    expect(http.get).not.toHaveBeenCalled()
  })

  it('puts back only what it removed on error, at its place, and keeps a notification arrived meanwhile', async () => {
    const pending = deferred()
    const { result, client } = renderWithJoutio(() => useRemoveAllNotifications(), {
      http: fakeHttp({ delete: () => pending.promise }),
    })
    client.setQueryData(notificationKeys.list(), inbox(notification('n1', null), notification('n2', 'x')))
    client.setQueryData(notificationKeys.unreadCount(), { count: 1 })

    act(() => result.current.mutate())
    await waitFor(() => expect(client.getQueryData(notificationKeys.unreadCount())).toEqual({ count: 0 }))
    // Une notification arrive pendant l'envoi.
    client.setQueryData(notificationKeys.list(), inbox(notification('n3', null)))
    client.setQueryData(notificationKeys.unreadCount(), { count: 1 })

    await act(async () => pending.reject(new Error('refused')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(notificationKeys.list())?.pages[0]?.content.map((item) => item.notificationId)).toEqual([
      'n1',
      'n2',
      'n3',
    ])
    expect(client.getQueryData(notificationKeys.unreadCount())).toEqual({ count: 2 })
  })
})
