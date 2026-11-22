import { keepPreviousData, skipToken, useInfiniteQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import type { PeopleSort } from '../../profile/types.js'
import { getContactsPage, type ContactDirection } from '../services/contacts-query.service.js'

/** Clés React Query des listes de personnes, exportées pour les écritures transversales (`queryKeys`). */
export const contactsKeys = {
  /** Toutes les listes d'abonnements / abonnés (préfixe). */
  all: () => ['contacts'] as const,
  list: (userId: string, direction: ContactDirection, query: string, sort: PeopleSort) => ['contacts', userId, direction, query, sort] as const,
}

/** Abonnements ou abonnés d'un joueur, par recherche et tri, paginés. */
export function useContacts(http: HttpClient, userId: string | undefined, direction: ContactDirection, query: string, sort: PeopleSort) {
  return useInfiniteQuery({
    queryKey: contactsKeys.list(userId ?? '', direction, query, sort),
    queryFn: userId ? ({ pageParam, signal }) => getContactsPage(http, userId, direction, query, sort, pageParam, signal) : skipToken,
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  })
}
