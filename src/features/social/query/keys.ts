import type { InfiniteData, QueryKey } from '@tanstack/react-query'
import { typed } from '../../../core/query/keys.js'
import type { PageResponse } from '../../../core/types/common.js'
import type { PlayerCardView } from '../../profile/types.js'
import type { ContactsList } from '../types.js'

export const contactKeys = {
  /** Toutes les listes de personnes (préfixe). */
  lists: () => ['contacts', 'list'] as const,
  list: (list: ContactsList) => typed<InfiniteData<PageResponse<PlayerCardView>, number>>()(['contacts', 'list', list]),
  /** Paramètres d'une clé de `lists()`. */
  listOf: (key: QueryKey) => key[2] as ContactsList,
  mutations: {
    follow: (userId: string) => ['social', 'follow', userId] as const,
    block: (userId: string) => ['social', 'block', userId] as const,
  },
}
