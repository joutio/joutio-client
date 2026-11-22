import { useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import { getHome } from '../services/home-query.service.js'

/** Clés React Query de l'accueil, exportées pour les écritures transversales (`queryKeys`). */
export const homeKeys = {
  all: () => ['home'] as const,
}

/** Rails de l'Accueil. */
export function useHome(http: HttpClient) {
  return useQuery({ queryKey: homeKeys.all(), queryFn: ({ signal }) => getHome(http, signal) })
}
