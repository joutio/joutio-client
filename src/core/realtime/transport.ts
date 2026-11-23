/**
 * Transport temps réel, tel que les deux apps l'implémentent (`lib/ws`, STOMP) : la lib ne connaît ni STOMP ni
 * WebSocket. Même principe que `HttpClient`.
 */
export interface RealtimeTransport {
  /**
   * Souscrit à une destination. `onMessage` reçoit chaque trame ; `onConnect` est rappelé à chaque connexion,
   * immédiatement si le transport est déjà connecté. Retourne l'annulation.
   */
  subscribe(destination: string, onMessage: (message: { body: string }) => void, onConnect?: () => void): () => void
}
