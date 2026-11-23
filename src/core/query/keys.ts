import { meKeys } from '../../features/me/hooks/use-me.js'
import { topicsKeys, topicKeys } from '../../features/topics/hooks/use-topics.js'
import { profileKeys } from '../../features/profile/hooks/use-profile.js'
import { contactsKeys } from '../../features/social/hooks/use-contacts.js'
import { challengesKeys } from '../../features/challenges/hooks/use-challenges.js'
import { roomsKeys } from '../../features/rooms/hooks/use-rooms.js'
import { gamesKeys, serverTimeKeys } from '../../features/game/hooks/use-game.js'
import { notificationPreferencesKeys, notificationsKeys } from '../../features/notifications/hooks/use-notifications.js'
import { authoringKeys } from '../../features/authoring/hooks/use-authoring.js'
import { homeKeys } from '../../features/home/hooks/use-home.js'
import { suggestionsKeys } from '../../features/search/hooks/use-search.js'
import { onboardingKeys } from '../../features/onboarding/hooks/use-onboarding.js'

/**
 * Clés React Query agrégées des deux apps, hiérarchiques : un préfixe (`topic.all`, `profiles.all`,
 * `authoring.topic`…) vise toutes les vues d'une entité. Les invalidations, du temps réel comme des mutations,
 * visent ces clés, jamais une chaîne écrite à la main. Chaque clé est **définie** dans les `queries.ts` de sa
 * feature ; cette table ne fait que les assembler pour les écritures transversales (`query/`, `realtime/`, apps).
 */
export const queryKeys = {
  me: meKeys.me,
  /** Disponibilité d'un pseudonyme, par clé normalisée (`pseudonymKey`). */
  pseudonymAvailability: meKeys.pseudonymAvailability,
  rewards: meKeys.rewards,
  /** Joueurs bloqués par le joueur courant (Réglages › Confidentialité). */
  blockedPlayers: meKeys.blockedPlayers,
  /** Horloge du serveur (`/api/clock`). */
  serverTime: serverTimeKeys.all,
  /** Recherche globale. */
  suggestions: suggestionsKeys,
  home: homeKeys.all,
  topics: {
    all: topicsKeys.all,
    /** Toutes les pages du catalogue, quel que soit le filtre. */
    lists: topicsKeys.lists,
    list: topicsKeys.list,
    facets: topicsKeys.facets,
  },
  topic: topicKeys,
  profiles: {
    /** Tout ce qui concerne un joueur (profil, titres, badges, parties…). */
    all: profileKeys.all,
    profile: profileKeys.profile,
    activity: profileKeys.activity,
    titles: profileKeys.titles,
    badges: profileKeys.badges,
    topics: profileKeys.topics,
    recentGames: profileKeys.recentGames,
    games: profileKeys.games,
    headToHead: profileKeys.headToHead,
  },
  /** Abonnements / abonnés d'un joueur, par recherche et tri. */
  contacts: contactsKeys,
  /** Défis nominatifs du joueur (reçus et envoyés). */
  challenges: challengesKeys.mine,
  /** Salons du joueur (`/api/rooms/mine`) : Défis, sa pastille et la reprise de partie. */
  myRooms: roomsKeys.myRooms,
  /** Un salon (`/api/rooms/{id}`). */
  room: roomsKeys.room,
  games: gamesKeys,
  notifications: {
    all: notificationsKeys.all,
    list: notificationsKeys.list,
    unreadCount: notificationsKeys.unreadCount,
  },
  notificationPreferences: notificationPreferencesKeys.all,
  /** Atelier de création (`creation.md`). */
  authoring: {
    all: authoringKeys.all,
    topics: authoringKeys.topics,
    created: authoringKeys.created,
    todo: authoringKeys.todo,
    /** Sujets publiés au nom proche, pour l'avertissement de doublon de « Nouveau sujet ». */
    named: authoringKeys.named,
    /** Tout l'atelier d'un sujet (préfixe). */
    topic: authoringKeys.topic,
    workshop: authoringKeys.workshop,
    questions: authoringKeys.questions,
    reports: authoringKeys.reports,
    team: authoringKeys.team,
    /** Détails de signalement d'un sujet (préfixe). */
    reportDetails: authoringKeys.reportDetails,
  },
  onboarding: {
    recommendations: onboardingKeys.recommendations,
  },
} as const
