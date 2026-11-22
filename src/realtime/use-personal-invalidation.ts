import type { AchievementView } from '../features/profile/types.js'
import type { NotificationView } from '../features/notifications/types.js'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { HttpClient } from '../http.js'
import { useMyId } from '../features/me/hooks/use-me.js'
import { queryKeys } from '../query/keys.js'
import type { RealtimeTransport } from './transport.js'

/**
 * Vues relues quand le serveur pousse un événement **d'un autre acteur** sur le flux personnel (2026-11-16, unifié
 * web/mobile le 2026-11-22). La règle des mutations reste : une commande locale est optimiste et ne relit rien ;
 * mais un événement du bus (abonné, défi, signalement, sujet repassé en brouillon, déblocage…) change des données
 * que le joueur n'a pas écrites, et les vues qui en dépendent suivent sans tirer pour rafraîchir. Une seule table :
 * chaque type dit ce qu'il touche.
 */
const PERSONAL: Record<NotificationView['type'], (notification: NotificationView) => QueryKey[]> = {
  // Compteur d'abonnés, listes Abonnés, fiche de l'abonné.
  FOLLOW: (notification) => [queryKeys.me(), queryKeys.contacts.all(), ...(notification.actorId ? [queryKeys.profiles.all(notification.actorId)] : [])],
  CHALLENGE_RECEIVED: () => [queryKeys.challenges()],
  CHALLENGE_DECLINED: () => [queryKeys.challenges(), queryKeys.myRooms()],
  // Défi accepté : sa salle apparaît, la partie suivra.
  ROOM_ACCEPTED: (notification) => [
    queryKeys.challenges(),
    queryKeys.myRooms(),
    queryKeys.games.activeAll(),
    ...(notification.sourceId ? [queryKeys.room(notification.sourceId)] : []),
  ],
  WIZZ: () => [queryKeys.myRooms()],
  // Signalement d'une question d'un de mes sujets : À traiter, file des signalements, compteurs des questions.
  QUESTION_REPORTED: (notification) => [
    queryKeys.authoring.todo(),
    queryKeys.authoring.topics(),
    ...(notification.topicId ? [queryKeys.authoring.reports(notification.topicId), queryKeys.authoring.questions(notification.topicId)] : []),
  ],
  // Sujet repassé en brouillon (moins de 7 questions jouables) : atelier, fiche, catalogue, accueil.
  TOPIC_DRAFTED: (notification) => [
    queryKeys.authoring.topics(),
    queryKeys.authoring.created(),
    queryKeys.authoring.todo(),
    queryKeys.topics.all(),
    queryKeys.home(),
    ...(notification.topicId ? [queryKeys.authoring.workshop(notification.topicId), queryKeys.topic.all(notification.topicId)] : []),
  ],
  ACCOUNT_SUSPENDED: () => [queryKeys.me()],
}

/** Vues relues après une **re**connexion (retour au premier plan) : le flux personnel n'a pas d'historique. */
const RESYNC = (): QueryKey[] => [queryKeys.me(), queryKeys.notifications.all(), queryKeys.challenges(), queryKeys.myRooms(), queryKeys.authoring.todo()]

interface Envelope {
  eventType?: string
  payload?: NotificationView
}

/**
 * Monté une fois dans l'app connectée : souscrit au flux personnel et à celui des déblocages, et invalide les vues
 * que chaque événement rend périmées. `http` et `subscribe` sont fournis par l'app (comme `HttpClient`).
 */
export function usePersonalInvalidation(http: HttpClient, subscribe: RealtimeTransport['subscribe']) {
  const client = useQueryClient()
  const userId = useMyId(http).data

  useEffect(() => {
    if (!userId) return
    const invalidate = (keys: readonly QueryKey[]) => keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))
    let connected = false

    const offPersonal = subscribe(
      `/topic/notifications/${userId}`,
      (message) => {
        let envelope: Envelope
        try {
          envelope = JSON.parse(message.body) as Envelope
        } catch {
          return
        }
        const notification = envelope.payload
        if (!notification?.notificationId) return
        // Créée ou supprimée ailleurs : la boîte et la cloche suivent.
        invalidate([queryKeys.notifications.all()])
        if (envelope.eventType === 'NOTIFICATION_DELETED') return
        invalidate(PERSONAL[notification.type]?.(notification) ?? [])
      },
      () => {
        if (connected) invalidate(RESYNC())
        connected = true
      },
    )

    const offAchievements = subscribe(`/topic/achievements/${userId}`, (message) => {
      let achievement: AchievementView
      try {
        achievement = JSON.parse(message.body) as AchievementView
      } catch {
        return
      }
      // Badge ou titre débloqué : profil, collection, titres, récompenses ; maîtrise du sujet pour un titre ; résultat
      // de la partie pour un badge de duel (séquence des badges, projection parfois en retard sur le résultat).
      invalidate([
        queryKeys.me(),
        queryKeys.rewards(),
        queryKeys.profiles.all(userId),
        ...(achievement.kind === 'TITLE' && achievement.topicId ? [queryKeys.topic.all(achievement.topicId)] : []),
        ...(achievement.kind === 'BADGE' && achievement.gameId ? [queryKeys.games.result(achievement.gameId)] : []),
      ])
    })

    return () => {
      offPersonal()
      offAchievements()
    }
  }, [client, subscribe, userId])

  return null
}
