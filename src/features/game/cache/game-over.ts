import type { QueryClient } from '@tanstack/react-query'
import { markStale } from '../../../core/query/stale.js'
import { homeKeys } from '../../home/query/keys.js'
import { meKeys } from '../../me/query/keys.js'
import { profileKeys } from '../../profile/query/keys.js'
import { topicKeys } from '../../topics/query/keys.js'
import type { GameEvent } from '../domain/game-event.js'
import type { ActiveGameView, GameState } from '../types.js'
import { gameKeys } from '../query/keys.js'

/** Événements qui terminent une partie : le serveur a tranché (victoire, forfait, annulation). */
export const isGameOver = (event: GameEvent) =>
  event.type === 'GAME_ENDED' || event.type === 'GAME_FORFEITED' || event.type === 'GAME_CANCELLED'

/**
 * Fin de partie apprise par le flux : la partie quitte les parties en cours (bannière « Rejoindre ») et les vues que le
 * résultat du serveur change (compte, profils et historiques des deux joueurs, fiche et classements du sujet, accueil)
 * sont marquées périmées, sans relecture : chacune est relue à sa prochaine ouverture. Idempotent (un historique rejoué
 * repasse ici).
 */
export function settleGameOver(client: QueryClient, game: GameState): void {
  client.setQueriesData<ActiveGameView[]>({ queryKey: gameKeys.actives() }, (games) =>
    games?.some((item) => item.gameId === game.gameId) ? games.filter((item) => item.gameId !== game.gameId) : games,
  )
  const players = [game.player1Id, game.player2Id].filter((id): id is string => id !== null)
  markStale(client, [
    meKeys.account(),
    meKeys.rewards(),
    ...players.map((id) => profileKeys.all(id)),
    ...(game.topicId ? [topicKeys.detail(game.topicId)] : []),
    homeKeys.view(),
  ])
}
