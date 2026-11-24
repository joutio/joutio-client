import { infiniteQueryOptions, queryOptions, skipToken } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { keepPreviousWhen, MAX_PAGES, nextPage } from '../../../core/query/pages.js'
import type { HistoryFilters } from '../types.js'
import {
  getActivity,
  getBadges,
  getHeadToHead,
  getHistoryPage,
  getPlayedTopics,
  getProfile,
  getTitles,
} from '../services/profile-query.service.js'
import { profileKeys } from './keys.js'

/** Lectures d'un joueur ; `userId` absent : aucune requête. */
export const profileQueries = {
  detail: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: profileKeys.detail(userId),
      queryFn: userId ? ({ signal }) => getProfile(http, userId, signal) : skipToken,
    }),
  activity: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: profileKeys.activity(userId),
      queryFn: userId ? ({ signal }) => getActivity(http, userId, signal) : skipToken,
    }),
  badges: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: profileKeys.badges(userId),
      queryFn: userId ? ({ signal }) => getBadges(http, userId, signal) : skipToken,
    }),
  topics: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: profileKeys.topics(userId),
      queryFn: userId ? ({ signal }) => getPlayedTopics(http, userId, signal) : skipToken,
    }),
  titles: (http: HttpClient, userId: string | undefined) =>
    queryOptions({
      queryKey: profileKeys.titles(userId),
      queryFn: userId ? ({ signal }) => getTitles(http, userId, signal) : skipToken,
    }),
  headToHead: (http: HttpClient, userId: string | undefined, against: string) =>
    queryOptions({
      queryKey: profileKeys.headToHead(userId, against),
      queryFn: userId ? ({ signal }) => getHeadToHead(http, userId, against, signal) : skipToken,
    }),
  /** Historique filtré et paginé ; un changement de filtre garde la liste du même joueur affichée. */
  history: (http: HttpClient, userId: string | undefined, filters: HistoryFilters) =>
    infiniteQueryOptions({
      queryKey: profileKeys.history(userId, filters),
      queryFn: userId ? ({ pageParam, signal }) => getHistoryPage(http, userId, filters, pageParam, signal) : skipToken,
      initialPageParam: 0,
      getNextPageParam: nextPage,
      maxPages: MAX_PAGES,
      placeholderData: keepPreviousWhen((key: readonly unknown[]) => userId !== undefined && key[1] === userId),
    }),
}
