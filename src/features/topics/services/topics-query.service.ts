import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { PageResponse } from '../../../core/types/common.js'
import type {
  CatalogueFilters,
  RankingFilters,
  TopicCardView,
  TopicFacetsView,
  TopicLeaderboardView,
  TopicOverviewView,
  TopicPage,
  TopicScope,
  TopicSort,
} from '../types.js'

export const PAGE_SIZE = 20

/** Page complète des classements : 20 joueurs par page. */
export const RANKING_SIZE = 20

/** Tri par défaut du catalogue (Sujets, feuille de défi). */
export const DEFAULT_TOPIC_SORT: TopicSort = 'POPULAR'

/** Tous les classements : depuis toujours, monde entier par défaut, comme l'onglet de la Fiche sujet (2026-11-06). */
export const DEFAULT_RANKING_FILTERS: Pick<RankingFilters, 'period' | 'scope'> = { period: 'ALL_TIME', scope: 'WORLD' }

/** En-tête et onglet Progression de la Fiche sujet. */
export async function getTopicOverview(
  http: HttpClient,
  topicId: string,
  signal?: AbortSignalLike,
): Promise<TopicOverviewView> {
  return http.get<TopicOverviewView>(`/api/topics/${segment(topicId)}/overview`, { signal })
}

/** Classement de la Fiche sujet : depuis toujours, monde entier, les dix premiers. */
export async function getTopicLeaderboard(
  http: HttpClient,
  topicId: string,
  signal?: AbortSignalLike,
): Promise<TopicLeaderboardView> {
  return http.get<TopicLeaderboardView>(`/api/topics/${segment(topicId)}/leaderboard`, {
    query: { period: 'ALL_TIME', scope: 'WORLD', page: 0, size: 10 },
    signal,
  })
}

const page = (
  http: HttpClient,
  filters: CatalogueFilters,
  category: string | undefined,
  index: number,
  signal?: AbortSignalLike,
) =>
  http.get<PageResponse<TopicCardView>>('/api/topics', {
    query: {
      q: filters.query || undefined,
      category,
      followed: filters.followed || undefined,
      mine: filters.mine || undefined,
      sort: filters.sort,
      page: index,
      size: filters.size ?? PAGE_SIZE,
    },
    signal,
  })

/** Ordre d'une page fusionnée quand le tri est connu côté client ; sinon on garde l'alternance du serveur. */
const compare: Partial<Record<TopicSort, (a: TopicCardView, b: TopicCardView) => number>> = {
  POPULAR: (a, b) => b.followersCount - a.followersCount,
}

/**
 * Une page du catalogue. **Écarts BFF mockés** (`sujets.md` § 5) : `GET /api/topics` ne prend qu'un univers et ne
 * sait pas exclure les sujets suivis. Plusieurs univers : une requête par univers, fusionnées page par page.
 * « Masquer les sujets suivis » : filtré ici, une page peut donc compter moins de 20 sujets.
 */
export async function getCataloguePage(
  http: HttpClient,
  filters: CatalogueFilters,
  index: number,
  signal?: AbortSignalLike,
): Promise<TopicPage> {
  const categories = filters.categories.length > 0 ? filters.categories : [undefined]
  const pages = await Promise.all(categories.map((category) => page(http, filters, category, index, signal)))
  let topics = pages.flatMap((result) => result.content)
  const sorter = compare[filters.sort]
  if (pages.length > 1 && sorter) topics = [...topics].sort(sorter)
  if (filters.hideFollowed) topics = topics.filter((topic) => !topic.followed)
  return { topics, last: pages.every((result) => result.last), page: index }
}

/** Nombre de sujets par univers pour une recherche (facettes). */
export async function getFacets(
  http: HttpClient,
  query: string,
  scope: TopicScope,
  signal?: AbortSignalLike,
): Promise<TopicFacetsView> {
  return http.get<TopicFacetsView>('/api/topics/facets', {
    query: { q: query || undefined, followed: scope === 'FOLLOWED' || undefined, mine: scope === 'MINE' || undefined },
    signal,
  })
}

/** Page complète des classements (`classements.md`) : période, portée et pagination. */
export async function getLeaderboardPage(
  http: HttpClient,
  topicId: string,
  filters: RankingFilters,
  pageIndex: number,
  signal?: AbortSignalLike,
): Promise<TopicLeaderboardView> {
  return http.get<TopicLeaderboardView>(`/api/topics/${segment(topicId)}/leaderboard`, {
    query: {
      period: filters.period,
      scope: filters.scope,
      month: filters.period === 'MONTHLY' ? filters.month : undefined,
      page: pageIndex,
      size: RANKING_SIZE,
    },
    signal,
  })
}
