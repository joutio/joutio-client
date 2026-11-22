/**
 * Clés React Query de la recherche globale, exportées pour les écritures transversales (`queryKeys`). Les hooks de
 * lecture arriveront avec la migration de la recherche des apps.
 */
export const suggestionsKeys = {
  /** Suggestions de sujets et de joueurs pour un terme. */
  term: (term: string) => ['suggestions', term] as const,
  players: (query: string) => ['suggestions', 'players', query] as const,
}
