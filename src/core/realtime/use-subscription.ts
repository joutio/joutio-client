import { useEffect, useRef } from 'react'
import type { RealtimeTransport } from './transport.js'

/**
 * Abonnement éphémère à une destination : aucun historique, aucun fold — chaque trame est
 * transformée par `parse` puis remise au `handler`. `onReconnect` (optionnel) est rappelé à chaque
 * **re**connexion (pas la connexion initiale), pour resynchroniser les vues qu'un flux sans
 * historique ne peut pas rattraper. `destination` à `null`/`undefined` : aucun abonnement.
 *
 * Les callbacks sont lus via des refs : ils peuvent changer à chaque rendu sans réabonner.
 */
export function useSubscription<T>(
  subscribe: RealtimeTransport['subscribe'],
  destination: string | null | undefined,
  parse: (body: string) => T | undefined,
  handler: (event: T) => void,
  onReconnect?: () => void,
) {
  const parseRef = useRef(parse)
  parseRef.current = parse
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect
  const hasOnReconnect = onReconnect !== undefined

  useEffect(() => {
    if (!destination) return
    let connected = false
    const onConnect = () => {
      if (connected) onReconnectRef.current?.()
      connected = true
    }
    return subscribe(
      destination,
      (message) => {
        const event = parseRef.current(message.body)
        if (event !== undefined) handlerRef.current(event)
      },
      hasOnReconnect ? onConnect : undefined,
    )
    // La destination seule pilote l'abonnement ; les callbacks sont lus via refs.
  }, [subscribe, destination, hasOnReconnect])
}
