import { useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import { getChallenges } from '../services/challenges-query.service.js'

/** Clés React Query des défis, exportées pour les écritures transversales (`queryKeys`). */
export const challengesKeys = {
  /** Défis nominatifs du joueur (reçus et envoyés). */
  mine: () => ['challenges', 'mine'] as const,
}

/** Défis nominatifs du joueur (reçus et envoyés). */
export function useChallenges(http: HttpClient) {
  return useQuery({ queryKey: challengesKeys.mine(), queryFn: ({ signal }) => getChallenges(http, signal) })
}
