import {
  skipToken,
  type GetNextPageParamFunction,
  type InfiniteData,
  type QueryFunction,
  type QueryKey,
  type SkipToken,
} from '@tanstack/react-query'
import type { AbortSignalLike } from '../http.js'
import type { PageResponse } from '../types/common.js'

/** Page suivante d'une page Spring (`last`, `page`), `undefined` après la dernière. */
export const nextPage = <TPage extends Pick<PageResponse<unknown>, 'last' | 'page'>>(
  last: TPage,
): number | undefined => (last.last ? undefined : last.page + 1)

/** Pages gardées en mémoire par une liste infinie : au-delà, les plus anciennes sont relues au besoin. */
export const MAX_PAGES = 10

/**
 * Lecture d'une liste paginée Spring, à étaler dans `infiniteQueryOptions` : page 0 d'abord, page suivante par
 * `nextPage`, `MAX_PAGES` en mémoire. `fetch` absent (identifiant manquant) : `skipToken`. La fonction de lecture est
 * typée ici, pas déduite du rappel de pagination : `data.pages` reste un `TPage[]` (`PageResponse<T>[]`), même avec
 * `skipToken`.
 */
export function pageQuery<TPage extends Pick<PageResponse<unknown>, 'last' | 'page'>>(
  fetch: ((page: number, signal: AbortSignalLike) => Promise<TPage>) | undefined,
): PageQuery<TPage> {
  return {
    queryFn: fetch ? ({ pageParam, signal }) => fetch(pageParam, signal) : skipToken,
    initialPageParam: 0,
    getNextPageParam: nextPage,
    maxPages: MAX_PAGES,
  }
}

/** Options de pagination produites par `pageQuery`. */
export interface PageQuery<TPage> {
  queryFn: QueryFunction<TPage, QueryKey, number> | SkipToken
  initialPageParam: number
  getNextPageParam: GetNextPageParamFunction<number, TPage>
  maxPages: number
}

/**
 * `placeholderData` qui garde les résultats précédents tant qu'ils concernent la même ressource (même joueur, même
 * sens de liste…) : un changement de filtre ne vide pas l'écran, un changement de ressource si.
 */
export function keepPreviousWhen<TData, TKey>(sameResource: (previousKey: TKey) => boolean) {
  return (previous: TData | undefined, previousQuery: { queryKey: TKey } | undefined) =>
    previousQuery && sameResource(previousQuery.queryKey) ? previous : undefined
}

/** Applique `fn` à chaque élément des pages d'une liste infinie. */
export function mapPages<TPage, TItem>(
  data: InfiniteData<TPage>,
  items: (page: TPage) => TItem[],
  withItems: (page: TPage, items: TItem[]) => TPage,
  fn: (items: TItem[]) => TItem[],
): InfiniteData<TPage> {
  return { ...data, pages: data.pages.map((page) => withItems(page, fn(items(page)))) }
}
