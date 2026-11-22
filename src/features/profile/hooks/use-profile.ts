import { keepPreviousData, skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import {
  getActivity,
  getBadges,
  getHeadToHead,
  getHistoryPage,
  getPlayedTopics,
  getProfile,
  getTitles,
} from '../services/profile-query.service.js'
import type { HistoryFilters } from '../services/profile-query.service.js'

/** Clés React Query des profils de joueurs, exportées pour les écritures transversales (`queryKeys`). */
export const profileKeys = {
  /** Tout ce qui concerne un joueur (préfixe) : profil, titres, badges, parties… */
  all: (userId: string) => ['profiles', userId] as const,
  profile: (userId: string) => ['profiles', userId, 'profile'] as const,
  activity: (userId: string) => ['profiles', userId, 'activity'] as const,
  titles: (userId: string) => ['profiles', userId, 'titles'] as const,
  badges: (userId: string) => ['profiles', userId, 'badges'] as const,
  topics: (userId: string) => ['profiles', userId, 'topics'] as const,
  recentGames: (userId: string) => ['profiles', userId, 'games', 'recent'] as const,
  games: (userId: string, filters: object) => ['profiles', userId, 'games', filters] as const,
  headToHead: (userId: string, against: string) => ['profiles', userId, 'head-to-head', against] as const,
}

/** Fiche joueur complète. */
export function useProfile(http: HttpClient, userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.profile(userId ?? ''),
    queryFn: userId ? ({ signal }) => getProfile(http, userId, signal) : skipToken,
  })
}

/** Série et jours joués. */
export function useActivity(http: HttpClient, userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.activity(userId ?? ''),
    queryFn: userId ? ({ signal }) => getActivity(http, userId, signal) : skipToken,
  })
}

/** Collection de badges par famille. */
export function useBadges(http: HttpClient, userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.badges(userId ?? ''),
    queryFn: userId ? ({ signal }) => getBadges(http, userId, signal) : skipToken,
  })
}

/** Sujets joués par un joueur. */
export function usePlayedTopics(http: HttpClient, userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.topics(userId ?? ''),
    queryFn: userId ? ({ signal }) => getPlayedTopics(http, userId, signal) : skipToken,
  })
}

/** Titres débloqués et titre porté. */
export function useTitles(http: HttpClient, userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.titles(userId ?? ''),
    queryFn: userId ? ({ signal }) => getTitles(http, userId, signal) : skipToken,
  })
}

/** Bilan des duels communs contre `against`. */
export function useHeadToHead(http: HttpClient, userId: string | undefined, against: string) {
  return useQuery({
    queryKey: profileKeys.headToHead(userId ?? '', against),
    queryFn: userId ? ({ signal }) => getHeadToHead(http, userId, against, signal) : skipToken,
  })
}

/** Historique des parties d'un joueur, filtré et paginé. */
export function useHistory(http: HttpClient, userId: string | undefined, filters: HistoryFilters) {
  return useInfiniteQuery({
    queryKey: profileKeys.games(userId ?? '', filters),
    queryFn: userId ? ({ pageParam, signal }) => getHistoryPage(http, userId, filters, pageParam, signal) : skipToken,
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  })
}
