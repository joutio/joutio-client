import { useEffect, useRef } from 'react'
import { useJoutio } from '../runtime/context.js'

/**
 * Abonnement éphémère à une destination : aucun historique, aucun repli. Chaque trame est transformée par `parse`
 * puis remise au `handler` ; une trame illisible (`undefined`) est ignorée. `onReconnect` est rappelé à chaque
 * **re**connexion (pas la première), pour resynchroniser ce qu'un flux sans historique ne rattrape pas.
 * `destination` absente : aucun abonnement.
 *
 * Les callbacks sont lus par référence : ils peuvent changer à chaque rendu sans réabonner.
 */
export function useSubscription<T>(
  destination: string | null | undefined,
  parse: (body: string) => T | undefined,
  handler: (event: T) => void,
  onReconnect?: () => void,
) {
  const { realtime } = useJoutio()
  const parseRef = useRef(parse)
  const handlerRef = useRef(handler)
  const onReconnectRef = useRef(onReconnect)
  useEffect(() => {
    parseRef.current = parse
    handlerRef.current = handler
    onReconnectRef.current = onReconnect
  })
  const resyncs = onReconnect !== undefined

  useEffect(() => {
    if (!destination) return
    let connected = false
    const onConnect = () => {
      if (connected) onReconnectRef.current?.()
      connected = true
    }
    return realtime.subscribe(
      destination,
      (message) => {
        const event = parseRef.current(message.body)
        if (event !== undefined) handlerRef.current(event)
      },
      resyncs ? onConnect : undefined,
    )
  }, [realtime, destination, resyncs])
}

/** Lit une enveloppe `{ eventType, payload }` du BFF ; `undefined` si la trame est illisible. */
export function parseEnvelope(body: string): { eventType?: string; payload?: unknown } | undefined {
  try {
    const value = JSON.parse(body) as unknown
    return typeof value === 'object' && value !== null
      ? (value as { eventType?: string; payload?: unknown })
      : undefined
  } catch {
    return undefined
  }
}
