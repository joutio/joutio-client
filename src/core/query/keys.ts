import type { DataTag, QueryKey } from '@tanstack/react-query'

/**
 * Clé typée par la donnée qu'elle désigne : `getQueryData` et `setQueryData` en déduisent le type, sans générique.
 * Chaque feature déclare ses clés dans `query/keys.ts` ; aucune clé n'est écrite ailleurs.
 */
export const typed =
  <TData>() =>
  <const TKey extends QueryKey>(key: TKey) =>
    key as DataTag<TKey, TData, Error>
