import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import { getNotificationPreferences, getNotificationsPage, getUnreadCount } from '../services/notifications-query.service.js'

/** Clés React Query des notifications, exportées pour les écritures transversales (`queryKeys`). */
export const notificationsKeys = {
  /** Tout ce qui concerne la boîte de réception (préfixe). */
  all: () => ['notifications'] as const,
  list: () => ['notifications', 'list'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
}

export const notificationPreferencesKeys = {
  all: () => ['notification-preferences'] as const,
}

/** Pastille non-lue de la cloche. */
export function useUnreadCount(http: HttpClient) {
  return useQuery({ queryKey: notificationsKeys.unreadCount(), queryFn: ({ signal }) => getUnreadCount(http, signal) })
}

/** Préférences de notification du joueur. */
export function useNotificationPreferences(http: HttpClient) {
  return useQuery({ queryKey: notificationPreferencesKeys.all(), queryFn: ({ signal }) => getNotificationPreferences(http, signal) })
}

/** Boîte de réception, paginée. */
export function useNotifications(http: HttpClient) {
  return useInfiniteQuery({
    queryKey: notificationsKeys.list(),
    queryFn: ({ pageParam, signal }) => getNotificationsPage(http, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  })
}
