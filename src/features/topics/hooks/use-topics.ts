import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useJoutio } from '../../../core/runtime/context.js'
import type { CatalogueFilters, RankingFilters, TopicScope } from '../types.js'
import { topicQueries } from '../query/queries.js'

/** Classement montré sur la fiche d'un sujet : depuis toujours, monde entier, les dix premiers. */
export const TOPIC_BOARD = { period: 'ALL_TIME', scope: 'WORLD', size: 10 } as const

/** En-tête et progression de la Fiche sujet. */
export function useTopicOverview(topicId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(topicQueries.overview(http, topicId))
}

/** Classement de la Fiche sujet (depuis toujours, monde, dix premiers). */
export function useTopicLeaderboard(topicId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(topicQueries.leaderboard(http, topicId))
}

/** Catalogue des sujets, paginé et filtré. */
export function useCatalogue(filters: CatalogueFilters) {
  const { http } = useJoutio()
  return useInfiniteQuery(topicQueries.catalogue(http, filters))
}

/** Facettes de recherche du catalogue. */
export function useFacets(query: string, scope: TopicScope = 'ALL') {
  const { http } = useJoutio()
  return useQuery(topicQueries.facets(http, query, scope))
}

/** Classement complet d'un sujet, paginé. */
export function useTopicBoard(topicId: string | undefined, filters: RankingFilters) {
  const { http } = useJoutio()
  return useInfiniteQuery(topicQueries.board(http, topicId, filters))
}
