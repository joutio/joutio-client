import type { AbortSignalLike, HttpClient } from '../../../http.js'
import type { PageResponse } from '../../../types/common.js'
import type { NotificationPreferenceView, NotificationView, UnreadCountView } from '../types.js'

export const NOTIFICATIONS_PAGE_SIZE = 10

/** Boîte de réception (`/api/notifications`). */
export async function getNotificationsPage(http: HttpClient, pageIndex: number, signal?: AbortSignalLike): Promise<PageResponse<NotificationView>> {
  return http.get<PageResponse<NotificationView>>('/api/notifications', { query: { page: pageIndex, size: NOTIFICATIONS_PAGE_SIZE }, signal })
}

export async function getUnreadCount(http: HttpClient, signal?: AbortSignalLike): Promise<UnreadCountView> {
  return http.get<UnreadCountView>('/api/notifications/unread-count', { signal })
}

export async function getNotificationPreferences(http: HttpClient, signal?: AbortSignalLike): Promise<NotificationPreferenceView[]> {
  return http.get<NotificationPreferenceView[]>('/api/notification-preferences', { signal })
}
