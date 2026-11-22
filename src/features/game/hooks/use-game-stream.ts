import type { HttpClient } from '../../../http.js'
import type { RealtimeTransport } from '../../../realtime/transport.js'
import { useEventStream } from '../../../realtime/use-stream.js'
import { Game } from '../domain/game.js'
import type { GameEvent } from '../domain/game-event.js'
import { getGameEvents } from '../services/game-query.service.js'

/**
 * Partie repliée de ses événements : historique REST à l'ouverture (et à chaque reconnexion),
 * puis STOMP seulement. `gameId` absent : aucun flux.
 */
export function useGameStream(http: HttpClient, subscribe: RealtimeTransport['subscribe'], gameId: string | undefined) {
  return useEventStream<GameEvent, Game>(
    gameId
      ? {
          key: `game:${gameId}`,
          initial: () => Game.empty(gameId),
          apply: (game, event) => game.onGameEvent(event),
          source: {
            load: () => getGameEvents(http, gameId),
            subscribe: (onFrame, onConnect) => subscribe(`/topic/games/${gameId}`, (message) => onFrame(message.body), onConnect),
          },
          // Partie fraîchement créée : la projection peut avoir quelques centaines de ms de retard.
          notFoundGraceMs: 5_000,
        }
      : null,
  )
}
