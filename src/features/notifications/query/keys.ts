import type { InfiniteData } from '@tanstack/react-query'
import { typed } from '../../../core/query/keys.js'
import type { PageResponse } from '../../../core/types/common.js'
import type { NotificationPreferenceView, NotificationView, UnreadCountView } from '../types.js'

export const notificationKeys = {
  root: ['notifications'] as const,
  list: () => typed<InfiniteData<PageResponse<NotificationView>, number>>()(['notifications', 'list']),
  unreadCount: () => typed<UnreadCountView>()(['notifications', 'unread-count']),
  preferences: () => typed<NotificationPreferenceView[]>()(['notifications', 'preferences']),
  mutations: {
    read: () => ['notifications', 'read'] as const,
    readAll: () => ['notifications', 'read-all'] as const,
    remove: () => ['notifications', 'remove'] as const,
    removeAll: () => ['notifications', 'remove-all'] as const,
    preference: () => ['notifications', 'preference'] as const,
  },
}
