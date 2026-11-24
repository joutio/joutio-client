import type { InferDataFromTag, QueryClient, QueryFilters, QueryKey } from '@tanstack/react-query'

/**
 * Optimisme à retour ciblé (`docs/frontend/donnees-et-etat.md`) : une mutation applique son changement à toutes les
 * vues concernées et garde l'inverse **de ce seul changement**. En cas d'échec, l'inverse s'applique sur la valeur
 * courante du cache : les changements d'autres mutations en cours sont préservés (pas de snapshot restauré en bloc).
 */
export type Undo = () => void

export const nothingToUndo: Undo = () => undefined

/** Annule dans l'ordre inverse d'application. */
export function undoAll(undos: readonly Undo[]): Undo {
  return () => [...undos].reverse().forEach((undo) => undo())
}

/** Annule les lectures en vol des clés touchées, pour qu'une réponse en retard n'écrase pas le changement optimiste. */
export async function cancel(client: QueryClient, keys: readonly QueryKey[]): Promise<void> {
  await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })))
}

/**
 * Applique `apply` à toutes les données en cache qui correspondent à `filters` et renvoie l'inverse, qui applique
 * `revert` aux mêmes requêtes. `apply` et `revert` reçoivent la valeur **courante** : ils doivent être ciblés (un champ,
 * une entrée), jamais un remplacement complet.
 */
export function change<TKey extends QueryKey, T = InferDataFromTag<unknown, TKey>>(
  client: QueryClient,
  filters: Omit<QueryFilters, 'queryKey'> & { queryKey: TKey },
  apply: (data: T) => T,
  revert: (data: T) => T,
): Undo {
  client.setQueriesData<T>(filters, (data) => (data === undefined ? data : apply(data)))
  return () => client.setQueriesData<T>(filters, (data) => (data === undefined ? data : revert(data)))
}

/**
 * Change des champs d'une donnée en cache (clé exacte). L'inverse remet les valeurs précédentes, seulement là où
 * personne ne les a changées depuis.
 */
export function changeFields<T extends object>(client: QueryClient, queryKey: QueryKey, fields: Partial<T>): Undo {
  const before = client.getQueryData<T>(queryKey)
  if (!before) return nothingToUndo
  const previous = Object.fromEntries(Object.keys(fields).map((key) => [key, before[key as keyof T]])) as Partial<T>
  return change<QueryKey, T>(
    client,
    { queryKey, exact: true },
    (data) => ({ ...data, ...fields }),
    (data) => ({ ...data, ...pickUnchanged(data, fields, previous) }),
  )
}

/** Les valeurs précédentes des seuls champs encore égaux à ce que la mutation a écrit. */
function pickUnchanged<T extends object>(data: T, written: Partial<T>, previous: Partial<T>): Partial<T> {
  return Object.fromEntries(
    Object.keys(written)
      .filter((key) => data[key as keyof T] === written[key as keyof T])
      .map((key) => [key, previous[key as keyof T]]),
  ) as Partial<T>
}

/** Contexte commun des mutations optimistes : l'inverse de leur changement. */
export interface Optimistic {
  undo: Undo
}

/** `onError` commun : défait le seul changement de cette mutation. */
export const undoOnError = (_error: unknown, _variables: unknown, context: Optimistic | undefined) => context?.undo()

/** Remplace l'entrée `id` d'une liste, ou la laisse telle quelle. */
export function replaceIn<T>(items: readonly T[], matches: (item: T) => boolean, fn: (item: T) => T): T[] {
  return items.map((item) => (matches(item) ? fn(item) : item))
}

/**
 * Retire les entrées d'une liste et renvoie de quoi les remettre à leur place si elles n'y sont pas revenues entre
 * temps.
 */
export function removeFrom<T>(items: readonly T[], matches: (item: T) => boolean) {
  const removed = items.flatMap((item, index) => (matches(item) ? [{ item, index }] : []))
  return {
    items: items.filter((item) => !matches(item)),
    restore: (current: readonly T[]) =>
      removed.reduce(
        (list, { item, index }) => (list.some(matches) ? list : [...list.slice(0, index), item, ...list.slice(index)]),
        [...current],
      ),
  }
}
