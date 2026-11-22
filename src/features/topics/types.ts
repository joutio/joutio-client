import type { MasteryTier } from '../profile/types.js'
import type { PageResponse } from '../../types/common.js'

/** Noms d'un sujet par langue (`fr` requis, `en` facultatif). */
export type TopicNames = Record<string, string>

export type TopicStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** Tri du catalogue (`TopicSort` de `joutio-theme-domain`). */
export type TopicSort = 'POPULAR' | 'MOST_PLAYED' | 'ALPHA' | 'RECENT'

export interface TopicCardView {
  topicId: string
  names: TopicNames
  /** Description française (contrat initial) ; préférer `descriptions` et `topicDescription`. */
  description: string | null
  /** Description par langue (2026-11-13), absente d'un BFF plus ancien. */
  descriptions?: TopicNames
  category: string | null
  categoryLabel: string | null
  /** Vignette (celle de `TopicCard`). */
  imageUrl: string | null
  /** Bannière panoramique de la fiche sujet. */
  bannerUrl: string | null
  /** Pictogramme carré de la tuile du catalogue (`TopicTile`) ; repli : vignette, puis catégorie. */
  pictogramUrl: string | null
  followersCount: number
  questionsCount: number
  followed: boolean
  status: TopicStatus
  /** Badge « Officiel » (2026-11-15) : sujet éditorial de Joutio ; absent d'un BFF plus ancien. */
  official?: boolean
}

/** `GET /api/topics/facets` : nombre de sujets par univers pour une recherche. */
export interface TopicFacetsView {
  total: number
  categories: { category: string; label: string; count: number }[]
}

/** `GET /api/topics/{id}/overview` : en-tête et onglet Progression de la Fiche sujet. */
export interface TopicOverviewView {
  topic: TopicCardView
  /** Titres thématiques par langue puis palier (`{ fr: { OR: "Connétable" } }`). Absent : repli « palier · sujet ». */
  titles: Record<string, Record<string, string>> | null
  myRank: number | null
  myProgress: TopicProgressView | null
  permissions?: import('../authoring/types.js').TopicPermissions
  canManage: boolean
}

export interface TopicProgressView {
  xp: number
  /** Parties humaines terminées dans le sujet (condition du premier titre). */
  games: number
  tier: MasteryTier
  tierProgressPercent: number
  tierRemainingXp: number
  nextTier: MasteryTier | null
  completedQuestions: number
  totalQuestions: number
  completionPercent: number
}

export type LeaderboardPeriod = 'ALL_TIME' | 'MONTHLY'
export type LeaderboardScope = 'WORLD' | 'FOLLOWING' | 'COUNTRY'

/** `GET /api/topics/{id}/leaderboard`. */
export interface TopicLeaderboardView {
  entries: PageResponse<LeaderboardEntryView>
  me: LeaderboardEntryView | null
}

export interface LeaderboardEntryView {
  rank: number
  userId: string
  pseudonym: string
  avatarOptions: string | null
  country: string | null
  /** Elo global (bordure d'avatar). */
  rating: number
  totalXp: number
  monthlyXp: number
  suspended: boolean
  /** Premium accordé (badge après le pseudonyme) ; un admin n'en a pas d'office. */
  premium: boolean
}

/** Référence courte d'un sujet, présente dans de nombreuses vues du BFF. */
export interface TopicRefView {
  topicId: string
  names: TopicNames
  category: string | null
  imageUrl: string | null
  pictogramUrl: string | null
  /** Titres thématiques par langue puis palier (`{ fr: { OR: "Connétable" } }`) ; absent : repli « palier · sujet ». */
  titles?: Record<string, Record<string, string>> | null
  /** Badge « Officiel » (2026-11-15). */
  official?: boolean
}
