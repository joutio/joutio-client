import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import type { HomeView } from '../types.js'

/** Endpoints de l'accueil. */

export async function getHome(http: HttpClient, signal?: AbortSignalLike): Promise<HomeView> {
  return http.get<HomeView>('/api/home', { signal })
}
