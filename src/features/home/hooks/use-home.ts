import { queryOptions, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { useJoutio } from '../../../core/runtime/context.js'
import { getHome } from '../services/home-query.service.js'
import { homeKeys } from '../query/keys.js'

export const homeQueries = {
  view: (http: HttpClient) =>
    queryOptions({ queryKey: homeKeys.view(), queryFn: ({ signal }) => getHome(http, signal) }),
}

/** Rails de l'Accueil. */
export function useHome() {
  const { http } = useJoutio()
  return useQuery(homeQueries.view(http))
}
