import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import type { SuggestionView } from '../types.js'

/** Recherche globale (`recherche.md` § 3) : sujets et joueurs d'une même requête. */
export async function getSuggestions(
  http: HttpClient,
  query: string,
  limit: number,
  signal?: AbortSignalLike,
): Promise<SuggestionView[]> {
  return http.get<SuggestionView[]>('/api/suggestions', { query: { q: query, limit }, signal })
}
