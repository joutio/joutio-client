import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { pageQuery } from '../../../core/query/pages.js'
import { useJoutio } from '../../../core/runtime/context.js'
import {
  getNotificationPreferences,
  getNotificationsPage,
  getUnreadCount,
} from '../services/notifications-query.service.js'
import { notificationKeys } from '../query/keys.js'

export const notificationQueries = {
  list: (http: HttpClient) =>
    infiniteQueryOptions({
      queryKey: notificationKeys.list(),
      ...pageQuery((page, signal) => getNotificationsPage(http, page, signal)),
    }),
  unreadCount: (http: HttpClient) =>
    queryOptions({ queryKey: notificationKeys.unreadCount(), queryFn: ({ signal }) => getUnreadCount(http, signal) }),
  preferences: (http: HttpClient) =>
    queryOptions({
      queryKey: notificationKeys.preferences(),
      queryFn: ({ signal }) => getNotificationPreferences(http, signal),
    }),
}

/** Boîte de réception, paginée. */
export function useNotifications() {
  const { http } = useJoutio()
  return useInfiniteQuery(notificationQueries.list(http))
}

/** Pastille non-lue de la cloche. */
export function useUnreadCount() {
  const { http } = useJoutio()
  return useQuery(notificationQueries.unreadCount(http))
}

/** Préférences de notification du joueur. */
export function useNotificationPreferences() {
  const { http } = useJoutio()
  return useQuery(notificationQueries.preferences(http))
}
