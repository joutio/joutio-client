import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { nothingToUndo, undoAll, type Undo } from '../../../core/query/optimistic.js'
import type { PageResponse } from '../../../core/types/common.js'
import type { PeopleSort, PlayerCardView } from '../../profile/types.js'
import type { ContactsList } from '../types.js'
import { contactKeys } from '../query/keys.js'

export type Pages = InfiniteData<PageResponse<PlayerCardView>, number>

const byPseudonym = (left: PlayerCardView, right: PlayerCardView) =>
  left.pseudonym.localeCompare(right.pseudonym, undefined, { sensitivity: 'base' })
const presenceRank = (card: PlayerCardView) => (card.presence?.status === 'ONLINE' ? 0 : 1)

/** Ordre des listes de personnes, identique au BFF (`ProfileViewService.peopleComparator`) ; `RECENT` : le plus récent en tête. */
const COMPARATORS: Record<PeopleSort, (left: PlayerCardView, right: PlayerCardView) => number> = {
  PRESENCE: (left, right) => presenceRank(left) - presenceRank(right) || byPseudonym(left, right),
  ELO: (left, right) => right.rating - left.rating || byPseudonym(left, right),
  ALPHA: byPseudonym,
  RECENT: () => -1,
}

export const hasCard = (data: Pages, userId: string) =>
  data.pages.some((page) => page.content.some((card) => card.userId === userId))

/** Insère la carte à sa place dans les pages chargées ; au-delà de la dernière page chargée, la pagination l'apportera. */
export function insertCard(data: Pages, card: PlayerCardView, sort: PeopleSort): Pages {
  const before = COMPARATORS[sort]
  const all = data.pages.flatMap((page) => page.content)
  const index = all.findIndex((item) => before(card, item) < 0)
  const complete = data.pages.at(-1)?.last ?? true
  if (index < 0 && !complete)
    return { ...data, pages: data.pages.map((page) => ({ ...page, totalElements: page.totalElements + 1 })) }
  let remaining = index < 0 ? all.length : index
  let placed = false
  const pages = data.pages.map((page, pageIndex) => {
    const last = pageIndex === data.pages.length - 1
    let content = page.content
    if (!placed && (remaining < page.content.length || last)) {
      content = [...page.content.slice(0, remaining), card, ...page.content.slice(remaining)]
      placed = true
    } else if (!placed) remaining -= page.content.length
    return { ...page, content, totalElements: page.totalElements + 1 }
  })
  return { ...data, pages }
}

export function removeCard(data: Pages, userId: string): Pages {
  if (!hasCard(data, userId)) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      content: page.content.filter((card) => card.userId !== userId),
      totalElements: Math.max(0, page.totalElements - 1),
    })),
  }
}

export const mapCards = (data: Pages, fn: (card: PlayerCardView) => PlayerCardView): Pages => ({
  ...data,
  pages: data.pages.map((page) => ({ ...page, content: page.content.map(fn) })),
})

/**
 * Applique à chaque liste de personnes en cache un changement propre à la liste (`edit` reçoit ses paramètres et
 * renvoie la nouvelle donnée et son inverse), et renvoie l'inverse global.
 */
export function editContactLists(
  client: QueryClient,
  edit: (list: ContactsList, data: Pages) => { data: Pages; revert: (current: Pages) => Pages } | undefined,
): Undo {
  return undoAll(
    client.getQueriesData<Pages>({ queryKey: contactKeys.lists() }).map(([key, data]) => {
      if (!data) return nothingToUndo
      const edited = edit(contactKeys.listOf(key), data)
      if (!edited) return nothingToUndo
      client.setQueryData(key, edited.data)
      return () => client.setQueryData<Pages>(key, (current) => (current ? edited.revert(current) : current))
    }),
  )
}
