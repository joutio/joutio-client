import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { PageResponse } from '../../../core/types/common.js'
import type {
  ActivityView,
  BadgeCollectionView,
  GameHistoryItemView,
  HeadToHeadView,
  PlayerProfileView,
  TitlesView,
  TopicStatView,
} from '../types.js'

/** Endpoints des profils de joueurs. */

export async function getProfile(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<PlayerProfileView> {
  return http.get<PlayerProfileView>(`/api/profiles/${segment(userId)}`, { signal })
}

export async function getActivity(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<ActivityView> {
  return http.get<ActivityView>(`/api/profiles/${segment(userId)}/activity`, { signal })
}

export async function getBadges(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<BadgeCollectionView> {
  return http.get<BadgeCollectionView>(`/api/profiles/${segment(userId)}/badges`, { signal })
}

export async function getPlayedTopics(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<TopicStatView[]> {
  return http.get<TopicStatView[]>(`/api/profiles/${segment(userId)}/topics`, { signal })
}

export async function getTitles(http: HttpClient, userId: string, signal?: AbortSignalLike): Promise<TitlesView> {
  return http.get<TitlesView>(`/api/profiles/${segment(userId)}/titles`, { signal })
}

export async function getHeadToHead(http: HttpClient, userId: string, against: string, signal?: AbortSignalLike): Promise<HeadToHeadView> {
  return http.get<HeadToHeadView>(`/api/profiles/${segment(userId)}/head-to-head`, { query: { against }, signal })
}

/** 20 parties par page (`historique.md` § 5). */
export const HISTORY_PAGE_SIZE = 20

export type HistoryOpponentType = 'HUMAN' | 'BOT'
export type HistoryOutcome = 'ALL' | 'WIN' | 'LOSS' | 'DRAW'
export type HistorySort = 'RECENT' | 'OLDEST'

export interface HistoryFilters {
  topicId?: string
  opponentId?: string
  opponentType?: HistoryOpponentType
  outcome: HistoryOutcome
  sort: HistorySort
}

export type HistoryFilterState = Pick<HistoryFilters, 'opponentType' | 'outcome' | 'sort'>

export const DEFAULT_HISTORY_FILTERS: HistoryFilterState = {
  outcome: 'ALL',
  sort: 'RECENT',
}

/** Mes parties (ou celles d'un joueur), filtrées et paginées. */
export async function getHistoryPage(
  http: HttpClient,
  userId: string,
  filters: HistoryFilters,
  pageIndex: number,
  signal?: AbortSignalLike,
): Promise<PageResponse<GameHistoryItemView>> {
  return http.get<PageResponse<GameHistoryItemView>>(`/api/profiles/${segment(userId)}/games`, {
    query: {
      topicId: filters.topicId,
      opponentId: filters.opponentId,
      opponentType: filters.opponentType,
      outcome: filters.outcome,
      sort: filters.sort,
      page: pageIndex,
      size: HISTORY_PAGE_SIZE,
    },
    signal,
  })
}
