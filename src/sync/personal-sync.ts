import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { markStale } from '../core/query/stale.js'
import { parseEnvelope, useSubscription } from '../core/realtime/use-subscription.js'
import { authoringKeys } from '../features/authoring/query/keys.js'
import { gameKeys } from '../features/game/query/keys.js'
import { homeKeys } from '../features/home/query/keys.js'
import { meKeys } from '../features/me/query/keys.js'
import { notificationKeys } from '../features/notifications/query/keys.js'
import type { NotificationView, PersonalNotificationEvent } from '../features/notifications/types.js'
import { profileKeys } from '../features/profile/query/keys.js'
import type { AchievementView } from '../features/profile/types.js'
import { useMyRooms } from '../features/rooms/hooks/use-rooms.js'
import { contactKeys } from '../features/social/query/keys.js'
import { topicKeys } from '../features/topics/query/keys.js'

/**
 * Vues relues quand le serveur pousse un événement **d'un autre acteur** (abonné, signalement, sujet repassé en
 * brouillon, suspension) : elles changent sans que le joueur ait rien écrit. Les salles sont une vue vivante
 * (`my-rooms`), pas l'inbox.
 */
const PERSONAL: Record<NotificationView['type'], (notification: NotificationView) => QueryKey[]> = {
  FOLLOW: (notification) => [
    meKeys.account(),
    contactKeys.lists(),
    ...(notification.actorId ? [profileKeys.all(notification.actorId)] : []),
  ],
  CHALLENGE_RECEIVED: () => [],
  CHALLENGE_DECLINED: () => [],
  ROOM_ACCEPTED: () => [],
  WIZZ: () => [],
  QUESTION_REPORTED: (notification) => [
    authoringKeys.todo(),
    authoringKeys.contributed(),
    ...(notification.topicId
      ? [authoringKeys.reports(notification.topicId), authoringKeys.questions(notification.topicId)]
      : []),
  ],
  TOPIC_DRAFTED: (notification) => [
    authoringKeys.contributed(),
    authoringKeys.created(),
    authoringKeys.todo(),
    topicKeys.lists(),
    homeKeys.view(),
    ...(notification.topicId
      ? [authoringKeys.topic(notification.topicId), topicKeys.detail(notification.topicId)]
      : []),
  ],
  ACCOUNT_SUSPENDED: () => [meKeys.account()],
}

/** Vues relues après une **re**connexion : les flux personnels n'ont pas d'historique. */
const RESYNC: QueryKey[] = [meKeys.account(), notificationKeys.root, authoringKeys.todo()]

const refresh = (client: QueryClient, keys: readonly QueryKey[]) =>
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))

function readNotificationEvent(body: string): PersonalNotificationEvent | undefined {
  const frame = parseEnvelope(body) as { eventType?: string; payload?: Partial<NotificationView> } | undefined
  const payload = frame?.payload
  if (typeof payload?.notificationId !== 'string' || !payload.notificationId) return undefined
  if (frame?.eventType === 'NOTIFICATION_DELETED') return { type: 'deleted', notificationId: payload.notificationId }
  if (payload.type && frame?.eventType === payload.type)
    return { type: 'created', notification: payload as NotificationView }
  return undefined
}

/** Le flux des succès pousse l'`AchievementView` brute, sans enveloppe. */
const readAchievement = (body: string) => parseEnvelope(body) as AchievementView | undefined

/**
 * Synchronise le cache sur les flux personnels du joueur connecté : inbox (`/topic/notifications/{userId}`), salles
 * (vue vivante `my-rooms`, gardée ouverte pour toute la session) et succès débloqués (`/topic/achievements/{userId}`). À monter **une fois**, sous `JoutioClientProvider`, tant qu'une session est
 * ouverte ; `userId` absent : aucun abonnement.
 */
export function useJoutioSync(userId: string | undefined) {
  const client = useQueryClient()

  useSubscription(
    userId ? `/topic/notifications/${userId}` : undefined,
    readNotificationEvent,
    (event) => {
      refresh(client, [notificationKeys.root])
      if (event.type === 'created') refresh(client, PERSONAL[event.notification.type](event.notification))
    },
    () => refresh(client, RESYNC),
  )

  // Une salle qui quitte la liste a abouti à une partie, ou a pris fin : les parties en cours sont à relire.
  const roomIds = useMyRooms(userId).data?.map((room) => room.roomId).join(' ')
  const previous = useRef(roomIds)
  useEffect(() => {
    const before = previous.current
    previous.current = roomIds
    if (before === undefined || roomIds === undefined) return
    const now = new Set(roomIds.split(' '))
    if (before.split(' ').some((roomId) => roomId && !now.has(roomId))) refresh(client, [gameKeys.actives()])
  }, [client, roomIds])

  useSubscription(userId ? `/topic/achievements/${userId}` : undefined, readAchievement, (achievement) => {
    if (!userId) return
    // Badge ou titre débloqué : relu à l'ouverture. Les badges d'un duel arrivent par sa récompense vivante.
    markStale(client, [
      meKeys.account(),
      meKeys.rewards(),
      profileKeys.all(userId),
      ...(achievement.kind === 'TITLE' && achievement.topicId ? [topicKeys.detail(achievement.topicId)] : []),
    ])
  })
}
