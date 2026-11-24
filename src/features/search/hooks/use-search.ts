import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { getSuggestions } from '../services/search-query.service.js'
import { searchKeys } from '../query/keys.js'

/** Recherche lancée à partir de 2 caractères. */
export const MIN_SEARCH_LENGTH = 2

/** Résultats par recherche : recherche globale (12) et invitation dans une équipe d'atelier (20). */
export const SEARCH_LIMIT = 12

export const searchQueries = {
  suggestions: (http: HttpClient, term: string, limit: number) =>
    queryOptions({
      queryKey: searchKeys.suggestions(term, limit),
      queryFn: term.length >= MIN_SEARCH_LENGTH ? ({ signal }) => getSuggestions(http, term, limit, signal) : skipToken,
    }),
}

/**
 * Sujets et joueurs qui correspondent à `term`, déjà temporisé par l'app (la lib n'a pas de minuterie). En dessous de
 * 2 caractères : aucune requête.
 */
export function useSuggestions(term: string, limit = SEARCH_LIMIT) {
  const { http } = useJoutio()
  return useQuery(searchQueries.suggestions(http, term.trim(), limit))
}
