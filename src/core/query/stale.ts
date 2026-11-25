import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Marque périmées, sans les relire, les vues qu'un calcul du serveur a rendues fausses (fin de partie, succès
 * débloqué) : chacune est relue à sa prochaine ouverture (`refetchOnMount`), jamais tout de suite.
 */
export function markStale(client: QueryClient, keys: readonly QueryKey[]): void {
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey, refetchType: 'none' }))
}
