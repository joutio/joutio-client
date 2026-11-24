import type { InfiniteData, QueryKey } from '@tanstack/react-query'
import { typed } from '../../../core/query/keys.js'
import type {
  CatalogueFilters,
  RankingFilters,
  TopicFacetsView,
  TopicLeaderboardView,
  TopicOverviewView,
  TopicPage,
  TopicScope,
} from '../types.js'

/** Clés des sujets : catalogue (`list`, `facets`) et fiche d'un sujet (`detail`), sous la même racine. */
export const topicKeys = {
  root: ['topics'] as const,
  /** Toutes les pages du catalogue, quels que soient les filtres. */
  lists: () => ['topics', 'list'] as const,
  list: (filters: CatalogueFilters) => typed<InfiniteData<TopicPage, number>>()(['topics', 'list', filters]),
  /** Filtres d'une clé de `lists()` (mise à jour de toutes les pages en cache). */
  listFilters: (key: QueryKey) => key[2] as CatalogueFilters,
  facets: (query: string, scope: TopicScope) => typed<TopicFacetsView>()(['topics', 'facets', { query, scope }]),
  /** Tout ce qui concerne un sujet (préfixe). */
  detail: (topicId: string | undefined) => ['topics', 'detail', topicId] as const,
  overview: (topicId: string | undefined) => typed<TopicOverviewView>()(['topics', 'detail', topicId, 'overview']),
  leaderboard: (topicId: string | undefined) =>
    typed<TopicLeaderboardView>()(['topics', 'detail', topicId, 'leaderboard']),
  board: (topicId: string | undefined, filters: RankingFilters) =>
    typed<InfiniteData<TopicLeaderboardView, number>>()(['topics', 'detail', topicId, 'board', filters]),
  mutations: {
    follow: (topicId: string) => ['topics', 'follow', topicId] as const,
  },
}
