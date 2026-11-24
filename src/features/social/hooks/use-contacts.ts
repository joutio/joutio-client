import { infiniteQueryOptions, skipToken, useInfiniteQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { keepPreviousWhen, MAX_PAGES, nextPage } from '../../../core/query/pages.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { getContactsPage } from '../services/contacts-query.service.js'
import type { ContactsList } from '../types.js'
import { contactKeys } from '../query/keys.js'

export const contactQueries = {
  /** Un changement de recherche ou de tri garde la liste du même joueur et du même sens affichée. */
  list: (http: HttpClient, list: ContactsList) => {
    const { userId, direction, query, sort } = list
    return infiniteQueryOptions({
      queryKey: contactKeys.list({ userId, direction, query, sort }),
      queryFn: userId
        ? ({ pageParam, signal }) => getContactsPage(http, userId, direction, query, sort, pageParam, signal)
        : skipToken,
      initialPageParam: 0,
      getNextPageParam: nextPage,
      maxPages: MAX_PAGES,
      placeholderData: keepPreviousWhen((key: readonly unknown[]) => {
        const previous = contactKeys.listOf(key)
        return userId !== undefined && previous.userId === userId && previous.direction === direction
      }),
    })
  },
}

/** Abonnements ou abonnés d'un joueur, par recherche et tri, paginés. */
export function useContacts(list: ContactsList) {
  const { http } = useJoutio()
  return useInfiniteQuery(contactQueries.list(http, list))
}
