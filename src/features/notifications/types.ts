/** `GET /api/notifications/unread-count`. */
export interface UnreadCountView {
  count: number
}

/** `REMATCH` : défi reçu depuis le résultat d'une partie ; `ACCOUNT` : obligatoire, jamais réglable. */
export type NotificationCategory = 'FOLLOW' | 'ROOM' | 'REMATCH' | 'QUESTION' | 'ACCOUNT'

/** `GET /api/notification-preferences`. */
export interface NotificationPreferenceView {
  category: NotificationCategory
  enabled: boolean
}

/** Notification personnelle (`NotificationView` du BFF), lue via `/api/notifications` et poussée sur `/topic/notifications/{userId}`. */
export interface NotificationView {
  notificationId: string
  type: 'FOLLOW' | 'CHALLENGE_RECEIVED' | 'CHALLENGE_DECLINED' | 'ROOM_ACCEPTED' | 'WIZZ' | 'QUESTION_REPORTED' | 'TOPIC_DRAFTED' | 'ACCOUNT_SUSPENDED'
  actorId: string | null
  /** Défi (`CHALLENGE_*`), salle (`ROOM_ACCEPTED`)… */
  sourceId: string | null
  topicId: string | null
  /** Partie d'origine : présent sur un `CHALLENGE_RECEIVED`, c'est une revanche. */
  gameId: string | null
  expiresAt: string | null
  readAt: string | null
  createdAt: string
}

/** Événement reçu sur le flux de l'inbox personnelle. */
export type PersonalNotificationEvent =
  | { type: 'created'; notification: NotificationView }
  | { type: 'deleted'; notificationId: string }
