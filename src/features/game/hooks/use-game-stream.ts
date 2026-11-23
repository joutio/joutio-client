import type { HttpClient } from '../../../core/http.js'
import type { RealtimeTransport } from '../../../core/index.js'
import { useEventStream } from '../../../core/index.js'
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
        }
      : null,
  )
}
