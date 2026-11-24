import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useJoutio } from '../../../core/runtime/context.js'
import type { HistoryFilters } from '../types.js'
import { profileQueries } from '../query/queries.js'

/** Fiche joueur complète. */
export function useProfile(userId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(profileQueries.detail(http, userId))
}

/** Série et jours joués. */
export function useActivity(userId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(profileQueries.activity(http, userId))
}

/** Collection de badges par famille. */
export function useBadges(userId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(profileQueries.badges(http, userId))
}

/** Sujets joués par un joueur. */
export function usePlayedTopics(userId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(profileQueries.topics(http, userId))
}

/** Titres débloqués et titre porté. */
export function useTitles(userId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(profileQueries.titles(http, userId))
}

/** Bilan des duels communs contre `against`. */
export function useHeadToHead(userId: string | undefined, against: string) {
  const { http } = useJoutio()
  return useQuery(profileQueries.headToHead(http, userId, against))
}

/** Historique des parties d'un joueur, filtré et paginé. */
export function useHistory(userId: string | undefined, filters: HistoryFilters) {
  const { http } = useJoutio()
  return useInfiniteQuery(profileQueries.history(http, userId, filters))
}
