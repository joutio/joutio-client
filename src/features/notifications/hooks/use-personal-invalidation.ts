import type { AchievementView } from '../../profile/types.js'
import type { NotificationView } from '../types.js'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { queryKeys } from '../../../core/query/keys.js'
import type { RealtimeTransport } from '../../../core/realtime/transport.js'
import { useSubscription } from '../../../core/realtime/use-subscription.js'
import { usePersonalNotifications } from './use-personal-notifications.js'

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

function parseAchievement(body: string): AchievementView | undefined {
  try {
    return JSON.parse(body) as AchievementView
  } catch {
    return undefined
  }
}

/** Synchronise les vues concernées par l'inbox personnelle et les récompenses. */
export function usePersonalInvalidation(subscribe: RealtimeTransport['subscribe'], userId: string | undefined) {
  const client = useQueryClient()
  const invalidate = (keys: readonly QueryKey[]) => keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))

  usePersonalNotifications(
    subscribe,
    userId,
    (event) => {
      void client.invalidateQueries({ queryKey: queryKeys.notifications.all() })
      if (event.type === 'created') {
        PERSONAL[event.notification.type]?.(event.notification).forEach((queryKey) => void client.invalidateQueries({ queryKey }))
      }
    },
    () => RESYNC().forEach((queryKey) => void client.invalidateQueries({ queryKey })),
  )

  useSubscription(
    subscribe,
    userId ? `/topic/achievements/${userId}` : undefined,
    parseAchievement,
    (achievement) => {
      if (!userId) return
      // Badge ou titre débloqué : profil, collection, titres, récompenses ; maîtrise du sujet pour un titre ; résultat
      // de la partie pour un badge de duel (séquence des badges, projection parfois en retard sur le résultat).
      invalidate([
        queryKeys.me(),
        queryKeys.rewards(),
        queryKeys.profiles.all(userId),
        ...(achievement.kind === 'TITLE' && achievement.topicId ? [queryKeys.topic.all(achievement.topicId)] : []),
        ...(achievement.kind === 'BADGE' && achievement.gameId ? [queryKeys.games.result(achievement.gameId)] : []),
      ])
    },
  )
}
