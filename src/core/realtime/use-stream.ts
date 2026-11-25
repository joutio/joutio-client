import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { EventStream, type EventEnvelope, type EventStreamOptions, type HistoryReader } from './stream.js'

/**
 * Délai de grâce d'un agrégat neuf : sa projection d'événements peut suivre de peu l'annonce (`ROOM_GAME_CREATED`,
 * lien ouvert à la création). Tant que le flux n'a jamais chargé, un 404 est relu jusqu'à 5 fois à 1 s d'intervalle
 * (≈ 5 s) avant de passer « introuvable ». Les relectures sont celles de TanStack Query (`retry`/`retryDelay`), pas un
 * timer de la lib.
 */
export const NEW_AGGREGATE_GRACE = { retries: 5, delayMs: 1_000 } as const

/** Clé, hors cache des vues, de la lecture d'historique d'un flux (`gcTime: 0` : rien n'y reste). */
export const streamHistoryKey = (key: string) => ['streams', key, 'history'] as const

const isMissing = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode === 404

/** Lecture d'historique confiée à TanStack Query : seul un 404 d'un flux jamais chargé est relu, dans la grâce. */
const graceReader =
  <T>(client: QueryClient, key: string): HistoryReader<T> =>
  (load, fresh) =>
    client.fetchQuery<EventEnvelope<T>[]>({
      queryKey: streamHistoryKey(key),
      queryFn: load,
      staleTime: 0,
      gcTime: 0,
      retry: (failures, error) => failures < NEW_AGGREGATE_GRACE.retries && isMissing(error) && fresh(),
      retryDelay: NEW_AGGREGATE_GRACE.delayMs,
    })

/**
 * Monte un `EventStream` le temps de vie du composant : état replié de l'agrégat (salle, partie…), statut du flux et
 * `resync()` (rejoue l'historique REST à la demande, quand l'app détecte un retard). `options` à `null` : aucun flux.
 * Un agrégat neuf a un délai de grâce (`NEW_AGGREGATE_GRACE`) avant d'être déclaré introuvable.
 */
export function useEventStream<T, S>(options: EventStreamOptions<T, S> | null) {
  const client = useQueryClient()
  const key = options?.key ?? ''
  const [stream, setStream] = useState<EventStream<T, S> | null>(null)

  useEffect(() => {
    if (!options) {
      setStream(null)
      return
    }
    const next = new EventStream(options, graceReader<T>(client, key))
    setStream(next)
    next.start()
    return () => next.stop()
    // Un flux par clé : les options (fonctions) changent à chaque rendu, la clé est stable.
  }, [key])

  const noop = () => () => undefined
  const state = useSyncExternalStore(stream?.subscribe ?? noop, () => stream?.getSnapshot() ?? null)
  const status = useSyncExternalStore(stream?.subscribe ?? noop, () => stream?.getStatus() ?? null)
  const resync = useCallback(() => stream?.resync(), [stream])
  return { state, status, resync }
}
