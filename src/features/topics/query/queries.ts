import { infiniteQueryOptions, keepPreviousData, queryOptions, skipToken } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { MAX_PAGES } from '../../../core/query/pages.js'
import type { CatalogueFilters, RankingFilters, TopicScope } from '../types.js'
import {
  getCataloguePage,
  getFacets,
  getLeaderboardPage,
  getTopicLeaderboard,
  getTopicOverview,
} from '../services/topics-query.service.js'
import { topicKeys } from './keys.js'

export const topicQueries = {
  overview: (http: HttpClient, topicId: string | undefined) =>
    queryOptions({
      queryKey: topicKeys.overview(topicId),
      queryFn: topicId ? ({ signal }) => getTopicOverview(http, topicId, signal) : skipToken,
    }),
  leaderboard: (http: HttpClient, topicId: string | undefined) =>
    queryOptions({
      queryKey: topicKeys.leaderboard(topicId),
      queryFn: topicId ? ({ signal }) => getTopicLeaderboard(http, topicId, signal) : skipToken,
    }),
  /** Catalogue filtré : un changement de filtre garde les résultats précédents affichés. */
  catalogue: (http: HttpClient, filters: CatalogueFilters) =>
    infiniteQueryOptions({
      queryKey: topicKeys.list({ ...filters, categories: [...filters.categories] }),
      queryFn: ({ pageParam, signal }) => getCataloguePage(http, filters, pageParam, signal),
      initialPageParam: 0,
      getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
      maxPages: MAX_PAGES,
      placeholderData: keepPreviousData,
    }),
  facets: (http: HttpClient, query: string, scope: TopicScope) =>
    queryOptions({
      queryKey: topicKeys.facets(query, scope),
      queryFn: ({ signal }) => getFacets(http, query, scope, signal),
    }),
  board: (http: HttpClient, topicId: string | undefined, filters: RankingFilters) =>
    infiniteQueryOptions({
      queryKey: topicKeys.board(topicId, filters),
      queryFn: topicId
        ? ({ pageParam, signal }) => getLeaderboardPage(http, topicId, filters, pageParam, signal)
        : skipToken,
      initialPageParam: 0,
      getNextPageParam: (last) => (last.entries.last ? undefined : last.entries.page + 1),
      maxPages: MAX_PAGES,
      placeholderData: keepPreviousData,
    }),
}
