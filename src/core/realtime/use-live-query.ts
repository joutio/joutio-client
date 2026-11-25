import {
  skipToken,
  useQuery,
  useQueryClient,
  type DataTag,
  type MutationKey,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { segment, type HttpClient, type AbortSignalLike } from '../http.js'
import { useJoutio } from '../runtime/context.js'
import { useSubscription } from './use-subscription.js'

/**
 * Valeur d'une vue vivante du BFF (`LiveUpdate`), identique en REST (`GET /api/live/<view>/{key}`) et en STOMP
 * (`/topic/live/<view>/{key}`). `version` est monotone : une valeur de version inférieure ou égale à celle détenue est
 * ignorée.
 */
export interface LiveUpdate<T> {
  view: string
  key: string
  version: number
  payload: T
}

/** Valeur en cache d'une vue vivante : `null` tant que le serveur n'en a produit aucune. */
export type LiveValue<T> = LiveUpdate<T> | null

/** Problème du BFF pour une vue vivante sans valeur pour cette clé. */
export const LIVE_NOT_FOUND = 'urn:joutio:bff:live:notFound'

export interface LiveQuery<T> {
  /** Clé de la feature propriétaire (`query/keys.ts`), typée `LiveValue<T>`. */
  queryKey: DataTag<QueryKey, LiveValue<T>, Error>
  /** Nom de la vue côté BFF. */
  view: string
  /** Clé de la vue (identifiant) ; absente : ni lecture ni abonnement. */
  key: string | null | undefined
  /**
   * Portée des mutations qui écrivent cette valeur : tant qu'une mutation de cette portée est en cours, les updates
   * reçus sont mis de côté, et seul le plus récent est appliqué quand elle se termine.
   */
  mutationKey?: MutationKey
}

/** Destination STOMP d'une vue vivante. */
export const liveDestination = (view: string, key: string) => `/topic/live/${view}/${key}`

/** Lecture REST d'une vue vivante ; `null` si elle n'a pas encore de valeur. */
export async function readLive<T>(
  http: HttpClient,
  view: string,
  key: string,
  signal?: AbortSignalLike,
): Promise<LiveValue<T>> {
  try {
    return await http.get<LiveUpdate<T>>(`/api/live/${segment(view)}/${segment(key)}`, { signal })
  } catch (error) {
    if ((error as { type?: string } | null)?.type === LIVE_NOT_FOUND) return null
    throw error
  }
}

/** La plus récente des deux valeurs ; à version égale, celle détenue reste (pas de retour en arrière visuel). */
export const newerLive = <T>(current: LiveValue<T> | undefined, next: LiveValue<T>): LiveValue<T> => {
  if (next === null) return current ?? null
  if (current == null || next.version > current.version) return next
  return current
}

/** Lit une trame `LiveUpdate` de cette vue et de cette clé ; `undefined` si elle est illisible ou d'une autre vue. */
const parseLive =
  <T>(view: string, key: string) =>
  (body: string): LiveUpdate<T> | undefined => {
    try {
      const value = JSON.parse(body) as Partial<LiveUpdate<T>> | null
      return value?.view === view && value.key === key && typeof value.version === 'number'
        ? (value as LiveUpdate<T>)
        : undefined
    } catch {
      return undefined
    }
  }

const apply = <T>(client: QueryClient, queryKey: DataTag<QueryKey, LiveValue<T>, Error>, update: LiveUpdate<T>) =>
  client.setQueryData(queryKey, (current) => newerLive(current, update))

/**
 * Troisième primitive temps réel (avenant ADR 0001 du 2026-11-25) : une lecture dont la valeur est **poussée**.
 *
 * 1. L'abonnement à `/topic/live/<view>/{key}` s'ouvre **avant** la lecture ; un update arrivé pendant la lecture est
 *    écrit dans le cache, et le résultat REST ne le remplace que s'il est plus récent.
 * 2. Ensuite, chaque update plus récent est écrit par `setQueryData` ; jamais d'invalidation ni de relecture.
 * 3. À la reconnexion du transport, cette seule clé est relue (même fusion par version).
 * 4. Pendant une mutation de la portée `mutationKey`, les updates attendent ; à la fin, seul le plus récent
 *    s'applique, et seulement s'il dépasse la version en cache.
 *
 * Le BFF envoie la valeur courante à chaque nouvel abonné : un update tombé entre l'abonnement et la lecture n'est
 * jamais perdu. `core` n'importe aucune feature : chaque feature expose son propre hook au-dessus de celui-ci.
 */
export function useLiveQuery<T, R = LiveValue<T>>(live: LiveQuery<T>, select?: (value: LiveValue<T>) => R) {
  const { http } = useJoutio()
  const client = useQueryClient()
  const { queryKey, view, key, mutationKey } = live
  const deferred = useRef<LiveUpdate<T> | null>(null)

  const busy = useCallback(
    () => mutationKey !== undefined && client.isMutating({ mutationKey }) > 0,
    [client, mutationKey],
  )

  const receive = useCallback(
    (update: LiveUpdate<T>) => {
      if (busy()) {
        deferred.current = newerLive(deferred.current, update)
        return
      }
      apply(client, queryKey, update)
    },
    // La clé de requête est recréée à chaque rendu ; son contenu suit `view` et `key`.
    [client, busy, view, key],
  )

  useEffect(() => {
    if (mutationKey === undefined) return
    return client.getMutationCache().subscribe(() => {
      const pending = deferred.current
      if (pending === null || busy()) return
      deferred.current = null
      apply(client, queryKey, pending)
    })
  }, [client, busy, view, key])

  // Ordre des effets : l'abonnement s'ouvre avant la première lecture de `useQuery`.
  useSubscription(
    key ? liveDestination(view, key) : null,
    key ? parseLive<T>(view, key) : () => undefined,
    receive,
    () => void client.refetchQueries({ queryKey, exact: true }),
  )

  // La clé vient de la feature, qui y encode `view` et `key` : la règle ne peut pas le voir.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return useQuery({
    queryKey,
    queryFn: key
      ? async ({ signal }) => {
          const read = await readLive<T>(http, view, key, signal)
          // Le cache est relu après la lecture : un update arrivé pendant celle-ci l'emporte s'il est plus récent.
          return newerLive(client.getQueryData(queryKey), read)
        }
      : skipToken,
    select,
  })
}
