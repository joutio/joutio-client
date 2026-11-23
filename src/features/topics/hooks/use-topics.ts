import { keepPreviousData, skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import {
  getCataloguePage,
  getFacets,
  getLeaderboardPage,
  getTopicLeaderboard,
  getTopicOverview,
  type CatalogueFilters,
  type RankingFilters,
  type TopicScope,
} from '../services/topics-query.service.js'

/** Clés React Query du catalogue, exportées pour les écritures transversales (`queryKeys`). */
export const topicsKeys = {
  /** Tout ce qui concerne le catalogue (préfixe). */
  all: () => ['topics'] as const,
  /** Toutes les pages du catalogue, quel que soit le filtre. */
  lists: () => ['topics', 'list'] as const,
  list: (filters: object) => ['topics', 'list', filters] as const,
  facets: (query: string, scope = 'ALL') => ['topics', 'facets', query, { scope }] as const,
}

/** Clés d'une fiche sujet, distinctes du catalogue. */
export const topicKeys = {
  /** Tout ce qui concerne un sujet (préfixe). */
  all: (topicId: string) => ['topic', topicId] as const,
  overview: (topicId: string) => ['topic', topicId, 'overview'] as const,
  leaderboard: (topicId: string) => ['topic', topicId, 'leaderboard'] as const,
  /** Classement filtré et paginé (Tous les classements). */
  board: (topicId: string, filters: object) => ['topic', topicId, 'board', filters] as const,
  games: (topicId: string, userId: string) => ['topic', topicId, 'games', userId] as const,
}

/** Classement montré sur la fiche d'un sujet : depuis toujours, monde entier, les dix premiers. */
export const TOPIC_BOARD = { period: 'ALL_TIME', scope: 'WORLD', size: 10 } as const

/** En-tête et progression de la Fiche sujet. */
export function useTopicOverview(http: HttpClient, topicId: string | undefined) {
  return useQuery({
    queryKey: topicKeys.overview(topicId ?? ''),
    queryFn: topicId ? ({ signal }) => getTopicOverview(http, topicId, signal) : skipToken,
  })
}

/** Classement de la Fiche sujet (depuis toujours, monde, dix premiers). */
export function useTopicLeaderboard(http: HttpClient, topicId: string | undefined) {
  return useQuery({
    queryKey: topicKeys.leaderboard(topicId ?? ''),
    queryFn: topicId ? ({ signal }) => getTopicLeaderboard(http, topicId, signal) : skipToken,
  })
}

/** Catalogue des sujets, paginé et filtré. */
export function useCatalogue(http: HttpClient, filters: CatalogueFilters) {
  return useInfiniteQuery({
    queryKey: topicsKeys.list({ ...filters, categories: [...filters.categories] }),
    queryFn: ({ pageParam, signal }) => getCataloguePage(http, filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  })
}

/** Facettes de recherche du catalogue. */
export function useFacets(http: HttpClient, query: string, scope: TopicScope = 'ALL') {
  return useQuery({ queryKey: topicsKeys.facets(query, scope), queryFn: ({ signal }) => getFacets(http, query, scope, signal) })
}

/** Classement complet d'un sujet, paginé. */
export function useTopicBoard(http: HttpClient, topicId: string | undefined, filters: RankingFilters) {
  return useInfiniteQuery({
    queryKey: topicKeys.board(topicId ?? '', filters),
    queryFn: topicId ? ({ pageParam, signal }) => getLeaderboardPage(http, topicId, filters, pageParam, signal) : skipToken,
    initialPageParam: 0,
    getNextPageParam: (last) => (last.entries.last ? undefined : last.entries.page + 1),
    placeholderData: keepPreviousData,
  })
}
