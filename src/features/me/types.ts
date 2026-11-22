import type { Language } from '../../types/common.js'
import type { DuelStatsView, ProgressionView } from '../profile/types.js'
import type { PlanLimitsView, PremiumSource } from '../premium/types.js'

/** `GET /api/me`, champs lus par l'app. */
export interface MeView {
  userId: string
  email: string
  pseudonym: string
  bio: string | null
  /** Code ISO-3166 alpha-2, `null` si non renseigné (portée Pays des classements). */
  country: string | null
  /** Options DiceBear sérialisées (JSON), `null` : avatar de base. */
  avatarOptions: string | null
  bannerUrl: string | null
  /** Clé du titre porté (`topicId:TIER`), null si aucun. */
  equippedTitle: string | null
  followingCount: number
  followersCount: number
  /** Codes des récompenses débloquées. */
  rewards: string[]
  language: Language
  /** Codes d'univers ordonnés (premier = principal), 3 au plus. */
  interests: string[]
  onboardingCompleted: boolean
  /** Droit Premium effectif (admin ou droit accordé, relu dans identity par le BFF). */
  premium: boolean
  /** Échéance du droit accordé ; `null` = sans échéance ou aucun droit. Absent avant BFF 2.1. */
  premiumUntil?: string | null
  /** Origine du droit accordé ; `null` = aucun droit. Absent avant BFF 2.1. */
  premiumSource?: PremiumSource | null
  /** Limites du plan appliquées par le BFF. Absent sur un BFF plus ancien : lire via `planLimits(me)`. */
  limits?: PlanLimitsView | null
  progression: ProgressionView | null
  stats: DuelStatsView | null
  /** Recherche expirée sans adversaire : entraînement automatique contre le bot (préférence du profil). */
  autoTrainOnTimeout: boolean
  /** Date de naissance privée (`AAAA-MM-JJ`), `null` si non renseignée. Absent avant BFF 2.3. */
  birthDate?: string | null
  /** Vrai si la date de naissance doit être demandée avant de jouer (compte récent sans date). Absent : `false`. */
  birthDateRequired?: boolean
  /** Version des CGU en vigueur (2026-11-15), à renvoyer à l'acceptation ; `null` = aucune exigée. */
  termsVersion?: string | null
  /** Faux : l'app présente les CGU avant de jouer (`PUT /api/me/terms`). */
  termsUpToDate?: boolean
}

/** `PUT /api/me/birth-date`. */
export interface BirthDateRequest {
  birthDate: string
}
