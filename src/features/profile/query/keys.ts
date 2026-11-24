import { typed } from '../../../core/query/keys.js'
import type { InfiniteData } from '@tanstack/react-query'
import type { PageResponse } from '../../../core/types/common.js'
import type {
  ActivityView,
  BadgeCollectionView,
  GameHistoryItemView,
  HeadToHeadView,
  HistoryFilters,
  PlayerProfileView,
  TitlesView,
  TopicStatView,
} from '../types.js'

/** Clés des profils : `['profiles', userId, …]`, le préfixe `all(userId)` vise tout ce qui concerne un joueur. */
export const profileKeys = {
  root: ['profiles'] as const,
  all: (userId: string | undefined) => ['profiles', userId] as const,
  detail: (userId: string | undefined) => typed<PlayerProfileView>()(['profiles', userId, 'detail']),
  activity: (userId: string | undefined) => typed<ActivityView>()(['profiles', userId, 'activity']),
  titles: (userId: string | undefined) => typed<TitlesView>()(['profiles', userId, 'titles']),
  badges: (userId: string | undefined) => typed<BadgeCollectionView>()(['profiles', userId, 'badges']),
  topics: (userId: string | undefined) => typed<TopicStatView[]>()(['profiles', userId, 'topics']),
  /** Toutes les listes d'historique d'un joueur (préfixe). */
  histories: (userId: string | undefined) => ['profiles', userId, 'games'] as const,
  history: (userId: string | undefined, filters: HistoryFilters) =>
    typed<InfiniteData<PageResponse<GameHistoryItemView>, number>>()(['profiles', userId, 'games', filters]),
  headToHead: (userId: string | undefined, against: string) =>
    typed<HeadToHeadView>()(['profiles', userId, 'head-to-head', against]),
  mutations: {
    field: (field: string) => ['profiles', 'update', field] as const,
    title: () => ['profiles', 'title'] as const,
  },
}
