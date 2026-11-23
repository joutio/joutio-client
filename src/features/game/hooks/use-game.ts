import {skipToken, useQuery} from '@tanstack/react-query'
import type {HttpClient} from '../../../core/http.js'
import {getActiveGames, getGameResult, getServerTime} from '../services/game-query.service.js'

/** Clés React Query des parties, exportées pour les écritures transversales (`queryKeys`). */
export const gamesKeys = {
    /** Toutes les listes de parties en cours (préfixe). */
    activeAll: () => ['games', 'active'] as const,
    /** Parties en cours du joueur (`/api/games?active=true`). */
    active: (userId: string) => ['games', 'active', userId] as const,
    result: (gameId: string) => ['games', gameId, 'result'] as const,
    streakUnlock: (gameId: string) => ['games', gameId, 'streak-unlock'] as const,
}

/** Horloge du serveur (`GET /api/clock`). */
export const serverTimeKeys = {
    all: () => ['server-time'] as const,
}

/** Horloge du serveur. */
export function useServerTime(http: HttpClient) {
    return useQuery({queryKey: serverTimeKeys.all(), queryFn: ({signal}) => getServerTime(http, signal)})
}

/** Parties en cours du joueur (bannière « Rejoindre »). */
export function useActiveGames(http: HttpClient, userId: string | undefined) {
    return useQuery({
        queryKey: gamesKeys.active(userId ?? ''),
        queryFn: userId ? ({signal}) => getActiveGames(http, signal) : skipToken,
    })
}

/** Résultat d'un duel (`GET /api/games/{id}/result`), revue des manches comprise. */
export function useGameResult(http: HttpClient, gameId: string | undefined) {
    return useQuery({
        queryKey: gamesKeys.result(gameId ?? ''),
        queryFn: gameId ? ({signal}) => getGameResult(http, gameId, signal) : skipToken,
    })
}
