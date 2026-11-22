/**
 * Transport temps réel, tel que les deux apps l'implémentent (`lib/ws`, STOMP) : la lib ne connaît ni STOMP ni
 * WebSocket. Même principe que `HttpClient`.
 */
export interface RealtimeTransport {
  /**
   * Souscrit à une destination. `onMessage` reçoit chaque trame ; `onReconnect` est rappelé à chaque **re**connexion
   * (jamais à la première, pour la resynchronisation des flux sans historique). Retourne l'annulation.
   */
  subscribe(destination: string, onMessage: (message: { body: string }) => void, onReconnect?: () => void): () => void
}
