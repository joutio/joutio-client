import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { NotificationCategory } from '../types.js'

/** Commandes de la boîte de réception et des préférences. */

/** `POST /api/notifications/{id}/read`. */
export async function readNotification(
  http: HttpClient,
  notificationId: string,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.post<void>(`/api/notifications/${segment(notificationId)}/read`, { signal })
}

/** `POST /api/notifications/read-all`. */
export async function readAllNotifications(http: HttpClient, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>('/api/notifications/read-all', { signal })
}

/** `DELETE /api/notifications/{id}`. */
export async function removeNotification(
  http: HttpClient,
  notificationId: string,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.delete<void>(`/api/notifications/${segment(notificationId)}`, { signal })
}

/** `DELETE /api/notifications` : vide la boîte. */
export async function removeAllNotifications(http: HttpClient, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>('/api/notifications', { signal })
}

/** `PUT /api/notification-preferences/{category}`. */
export async function setNotificationPreference(
  http: HttpClient,
  category: NotificationCategory,
  enabled: boolean,
  signal?: AbortSignalLike,
): Promise<void> {
  return http.put<void>(`/api/notification-preferences/${category}`, { body: { enabled }, signal })
}
