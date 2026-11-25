import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { change, nothingToUndo, undoAll, type Undo } from '../../../core/query/optimistic.js'
import { useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import type { PageResponse } from '../../../core/types/common.js'
import { notificationKeys } from '../query/keys.js'
import type { NotificationCategory, NotificationView } from '../types.js'
import {
  readAllNotifications,
  readNotification,
  removeAllNotifications,
  removeNotification,
  setNotificationPreference,
} from '../services/notifications-command.service.js'

type Inbox = InfiniteData<PageResponse<NotificationView>, number>

const inInbox =
  (fn: (items: NotificationView[]) => NotificationView[]) =>
  (data: Inbox): Inbox => ({
    ...data,
    pages: data.pages.map((page) => ({ ...page, content: fn(page.content) })),
  })

const findIn = (client: QueryClient, notificationId: string) =>
  client
    .getQueryData(notificationKeys.list())
    ?.pages.flatMap((page) => page.content)
    .find((item) => item.notificationId === notificationId)

/** Ajoute `delta` aux non-lues ; l'inverse retranche le même delta. */
function shiftUnread(client: QueryClient, delta: number): Undo {
  if (delta === 0) return nothingToUndo
  return change(
    client,
    { queryKey: notificationKeys.unreadCount(), exact: true },
    (view) => ({ count: Math.max(0, view.count + delta) }),
    (view) => ({ count: Math.max(0, view.count - delta) }),
  )
}

/** Marque une notification lue (`at` : instant de lecture affiché). */
function markRead(client: QueryClient, ids: ReadonlySet<string>, at: string): Undo {
  return change(
    client,
    { queryKey: notificationKeys.list(), exact: true },
    inInbox((items) =>
      items.map((item) => (ids.has(item.notificationId) && item.readAt === null ? { ...item, readAt: at } : item)),
    ),
    inInbox((items) =>
      items.map((item) => (ids.has(item.notificationId) && item.readAt === at ? { ...item, readAt: null } : item)),
    ),
  )
}

/** Lit une notification : elle perd son état non lu et la pastille baisse. */
export function useReadNotification() {
  return useOptimisticMutation({
    mutationKey: notificationKeys.mutations.read(),
    mutationFn: (notificationId: string, { http }) => readNotification(http, notificationId),
    touches: () => [notificationKeys.list(), notificationKeys.unreadCount()],
    apply: (client, notificationId, { clock }) => {
      const unread = findIn(client, notificationId)?.readAt === null
      return undoAll([
        markRead(client, new Set([notificationId]), new Date(clock()).toISOString()),
        shiftUnread(client, unread ? -1 : 0),
      ])
    },
  })
}

/** Tout lire : les notifications chargées passent lues, la pastille tombe à zéro. */
export function useReadAllNotifications() {
  return useOptimisticMutation({
    mutationKey: notificationKeys.mutations.readAll(),
    mutationFn: (_: void, { http }) => readAllNotifications(http),
    touches: () => [notificationKeys.list(), notificationKeys.unreadCount()],
    apply: (client, _variables, { clock }) => {
      const unread = new Set(
        client
          .getQueryData(notificationKeys.list())
          ?.pages.flatMap((page) => page.content)
          .filter((item) => item.readAt === null)
          .map((item) => item.notificationId) ?? [],
      )
      const count = client.getQueryData(notificationKeys.unreadCount())?.count ?? 0
      return undoAll([markRead(client, unread, new Date(clock()).toISOString()), shiftUnread(client, -count)])
    },
  })
}

/** Retire une notification de la boîte ; une non-lue fait baisser la pastille. */
export function useRemoveNotification() {
  return useOptimisticMutation({
    mutationKey: notificationKeys.mutations.remove(),
    mutationFn: (notificationId: string, { http }) => removeNotification(http, notificationId),
    touches: () => [notificationKeys.list(), notificationKeys.unreadCount()],
    apply: (client, notificationId) => {
      const removed = findIn(client, notificationId)
      if (!removed) return nothingToUndo
      const pageIndex =
        client.getQueryData(notificationKeys.list())?.pages.findIndex((page) => page.content.includes(removed)) ?? 0
      const index = client.getQueryData(notificationKeys.list())?.pages[pageIndex]?.content.indexOf(removed) ?? 0
      return undoAll([
        change(
          client,
          { queryKey: notificationKeys.list(), exact: true },
          inInbox((items) => items.filter((item) => item.notificationId !== notificationId)),
          (data) =>
            data.pages.some((page) => page.content.some((item) => item.notificationId === notificationId))
              ? data
              : {
                  ...data,
                  pages: data.pages.map((page, current) =>
                    current === pageIndex
                      ? { ...page, content: [...page.content.slice(0, index), removed, ...page.content.slice(index)] }
                      : page,
                  ),
                },
        ),
        shiftUnread(client, removed.readAt === null ? -1 : 0),
      ])
    },
  })
}

/** Remet à leur place les notifications retirées qui ne sont pas revenues entre temps. */
const restoreInto = (current: readonly NotificationView[], removed: readonly NotificationView[]) =>
  removed.reduce<NotificationView[]>(
    (items, item, index) =>
      items.some((other) => other.notificationId === item.notificationId)
        ? items
        : [...items.slice(0, index), item, ...items.slice(index)],
    [...current],
  )

/**
 * Tout supprimer : la boîte se vide et la pastille tombe à zéro tout de suite. À l'échec, seules les notifications
 * retirées reviennent, à leur place, et la pastille remonte du même nombre.
 */
export function useRemoveAllNotifications() {
  return useOptimisticMutation({
    mutationKey: notificationKeys.mutations.removeAll(),
    mutationFn: (_: void, { http }) => removeAllNotifications(http),
    touches: () => [notificationKeys.list(), notificationKeys.unreadCount()],
    apply: (client) => {
      const removed = client.getQueryData(notificationKeys.list())?.pages.map((page) => page.content) ?? []
      const count = client.getQueryData(notificationKeys.unreadCount())?.count ?? 0
      return undoAll([
        change(
          client,
          { queryKey: notificationKeys.list(), exact: true },
          inInbox(() => []),
          (data) => ({
            ...data,
            pages: data.pages.map((page, index) => ({
              ...page,
              content: restoreInto(page.content, removed[index] ?? []),
            })),
          }),
        ),
        shiftUnread(client, -count),
      ])
    },
  })
}

/** Active ou coupe une catégorie de notifications. */
export function useSetNotificationPreference() {
  return useOptimisticMutation({
    mutationKey: notificationKeys.mutations.preference(),
    mutationFn: ({ category, enabled }: { category: NotificationCategory; enabled: boolean }, { http }) =>
      setNotificationPreference(http, category, enabled),
    touches: () => [notificationKeys.preferences()],
    apply: (client, { category, enabled }) =>
      change(
        client,
        { queryKey: notificationKeys.preferences(), exact: true },
        (items) => items.map((item) => (item.category === category ? { ...item, enabled } : item)),
        (items) =>
          items.map((item) =>
            item.category === category && item.enabled === enabled ? { ...item, enabled: !enabled } : item,
          ),
      ),
  })
}
