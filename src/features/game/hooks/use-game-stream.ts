import { useJoutio } from '../../../core/runtime/context.js'
import { useEventStream } from '../../../core/realtime/use-stream.js'
import { Game } from '../domain/game.js'
import type { GameEvent } from '../domain/game-event.js'
import { getGameEvents } from '../services/game-query.service.js'

/** Partie repliée de ses événements : historique REST à l'ouverture (et à chaque reconnexion), puis STOMP. */
export function useGameStream(gameId: string | undefined) {
  const { http, realtime } = useJoutio()
  return useEventStream<GameEvent, Game>(
    gameId
      ? {
          key: `game:${gameId}`,
          initial: () => Game.empty(gameId),
          apply: (game, event) => game.onGameEvent(event),
          source: {
            load: () => getGameEvents(http, gameId),
            subscribe: (onFrame, onConnect) =>
              realtime.subscribe(`/topic/games/${gameId}`, (message) => onFrame(message.body), onConnect),
          },
        }
      : null,
  )
}
