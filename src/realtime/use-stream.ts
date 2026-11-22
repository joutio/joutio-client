import { useEffect, useState, useSyncExternalStore } from 'react'
import { EventStream, type EventStreamOptions } from './stream.js'

/**
 * Monte un `EventStream` le temps de vie du composant : état replié de l'agrégat (salle, partie…)
 * et statut du flux. `options` à `null` : aucun flux.
 */
export function useEventStream<T, S>(options: EventStreamOptions<T, S> | null) {
  const key = options?.key ?? ''
  const [stream, setStream] = useState<EventStream<T, S> | null>(null)

  useEffect(() => {
    if (!options) {
      setStream(null)
      return
    }
    const next = new EventStream(options)
    setStream(next)
    next.start()
    return () => next.stop()
    // Un flux par clé : les options (fonctions) changent à chaque rendu, la clé est stable.
  }, [key])

  const noop = () => () => undefined
  const state = useSyncExternalStore(stream?.subscribe ?? noop, () => stream?.getSnapshot() ?? null)
  const status = useSyncExternalStore(stream?.subscribe ?? noop, () => stream?.getStatus() ?? null)
  return { state, status, refresh: () => stream?.refresh() }
}
