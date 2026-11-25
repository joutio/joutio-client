import { useQueryClient } from '@tanstack/react-query'
import { useJoutio } from '../../../core/runtime/context.js'
import { useEventStream } from '../../../core/realtime/use-stream.js'
import { isGameOver, settleGameOver } from '../cache/game-over.js'
import { Game } from '../domain/game.js'
import type { GameEvent } from '../domain/game-event.js'
import { getGameEvents } from '../services/game-query.service.js'

/**
 * Partie repliée de ses événements : historique REST à l'ouverture (et à chaque reconnexion, ou à la demande par
 * `resync()`), puis STOMP. Une partie neuve a un délai de grâce avant « introuvable » (`NEW_AGGREGATE_GRACE`). La fin
 * de partie (`GAME_ENDED`, `GAME_FORFEITED`, `GAME_CANCELLED`) retire la partie des parties en cours et marque
 * périmées les vues que son résultat change (`settleGameOver`).
 */
export function useGameStream(gameId: string | undefined) {
  const { http, realtime } = useJoutio()
  const client = useQueryClient()
  return useEventStream<GameEvent, Game>(
    gameId
      ? {
          key: `game:${gameId}`,
          initial: () => Game.empty(gameId),
          apply: (game, event) => game.onGameEvent(event),
          onEvent: (game, event) => {
            if (isGameOver(event)) settleGameOver(client, game)
          },
          source: {
            load: () => getGameEvents(http, gameId),
            subscribe: (onFrame, onConnect) =>
              realtime.subscribe(`/topic/games/${gameId}`, (message) => onFrame(message.body), onConnect),
          },
        }
      : null,
  )
}
