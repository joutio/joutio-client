/** Palier de maîtrise d'un sujet (`MasteryTier` de `joutio-profile-domain`), mêmes codes que les tokens `tier`. */
export type MasteryTier = 'FER' | 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE' | 'EMERAUDE' | 'DIAMANT'

export type PresenceStatus = 'ONLINE' | 'OFFLINE'

export type PeopleSort = 'PRESENCE' | 'RECENT' | 'ELO' | 'ALPHA'

export type BadgeFamily =
  | 'VOLUME'
  | 'VICTORY'
  | 'MASTERY'
  | 'EXPLOIT'
  | 'SERIES'
  | 'ASSIDUITY'
  | 'SOCIAL'
  | 'CHALLENGES'
  | 'VISION'
  | 'PRECISION'
  | 'SPEED'
  | 'EXPLORATION'
  | 'COLLECTION'

/** `GET /api/profiles/pseudonym-availability?value=` : `available` vaut aussi pour le pseudonyme actuel du joueur. */
export interface PseudonymAvailability {
  pseudonym: string
  valid: boolean
  available: boolean
}

export interface ProgressionView {
  /** Elo global. */
  rating: number
  peakRating: number
  ratedGames: number
}

export interface DuelStatsView {
  played: number
  wins: number
  losses: number
  draws: number
  winPercent: number
  bestScore: number
  currentWinStreak: number
  bestWinStreak: number
}

/** Référence courte d'un joueur, présente dans de nombreuses vues du BFF. */
export interface UserRefView {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  suspended: boolean
  /** Premium accordé (badge après le pseudonyme) ; un admin n'en a pas d'office. */
  premium: boolean
}

/** `RoomView.opponent` / notification `MATCHED` : adversaire enrichi par le BFF (Elo, pays). */
export interface RoomOpponentView extends UserRefView {
  rating: number | null
  country: string | null
}

export interface PresenceView {
  userId: string
  status: PresenceStatus
  lastSeenAt: string | null
}

/** `GET /api/profiles/{id}` : fiche joueur complète (profil public + progression + stats). */
export interface PlayerProfileView {
  userId: string
  pseudonym: string
  bio: string | null
  country: string | null
  avatarOptions: string | null
  bannerUrl: string | null
  /** Clé du titre porté (`topicId:TIER`), null si aucun. */
  equippedTitle: string | null
  isMe: boolean
  following: boolean
  presence: PresenceView | null
  progression: ProgressionView | null
  stats: DuelStatsView | null
  followersCount: number
  followingCount: number
  suspended: boolean
  /** Premium accordé (badge après le pseudonyme) ; un admin n'en a pas d'office. */
  premium: boolean
  /** Le joueur courant a bloqué ce joueur : « Débloquer » à la place de Défier et Suivre. */
  blocked: boolean
  bot: boolean
}

/** `GET /api/profiles/{id}/topics` : sujet joué par un joueur. */
export interface TopicStatView {
  topicId: string
  names: import('../topics/types.js').TopicNames
  /** Catégorie du sujet : couleur de sa part dans le donut. */
  category: string | null
  imageUrl: string | null
  pictogramUrl: string | null
  games: number
  xp: number
  /** Badge « Officiel » (2026-11-15). */
  official?: boolean
}

/** `GET /api/profiles/{id}/head-to-head?against=` : bilan des duels communs. */
export interface HeadToHeadView {
  played: number
  wins: number
  losses: number
  draws: number
}

/** `GET /api/profiles/{id}/following|followers` : carte joueur. */
export interface PlayerCardView {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  rating: number
  following: boolean
  presence: { userId: string; status: PresenceStatus; lastSeenAt: string | null } | null
  suspended: boolean
  /** Premium accordé (badge après le pseudonyme) ; un admin n'en a pas d'office. */
  premium: boolean
}

/** `GET /api/profiles/{id}/games` : historique des parties d'un joueur (filtrable par sujet). */
export interface GameHistoryItemView {
  gameId: string
  topic: import('../topics/types.js').TopicRefView
  opponent: UserRefView | null
  /** `HUMAN` ou `BOT`. */
  opponentType: string | null
  outcome: import('../game/types.js').GameOutcome
  myScore: number
  opponentScore: number
  /** XP gagnée (null : entraînement contre un bot). */
  xp: number | null
  playedAt: string
}

/** `GET /api/profiles/{id}/titles`. */
export interface TitlesView {
  /** Clé du titre porté (`topicId:TIER`), null si aucun. */
  equippedKey: string | null
  titles: TitleView[]
}

export interface TitleView {
  key: string
  topicId: string
  tier: MasteryTier
  tierProgressPercent: number
  tierRemainingXp: number
  nextTier: MasteryTier | null
  topic: import('../topics/types.js').TopicRefView
  /** Date de déblocage du palier (ISO-8601) ; la liste est triée du plus récent au plus ancien. */
  unlockedAt: string
}

/** Badge en bref (`ProgressionView.BadgeView` du BFF) : séquence du résultat. */
export interface BadgeView {
  code: string
  /** Libellé source (français) du catalogue. */
  label: string
  family: BadgeFamily
  tier: MasteryTier
}

/** Déblocage poussé sur `/topic/achievements/{userId}` (`AchievementView` du BFF). */
export interface AchievementView {
  kind: 'BADGE' | 'TITLE'
  code: string | null
  label: string | null
  family: BadgeFamily | null
  tier: string | null
  metric: string | null
  target: number | null
  /** Sujet d'un titre, `null` pour un badge. */
  topicId: string | null
  /** Partie qui a débloqué le badge, `null` hors duel et pour un titre. */
  gameId: string | null
  at: string
}

/** Un palier de badge (`BadgeCollectionView.BadgeItemView`). */
export interface BadgeItemView {
  code: string
  /** Libellé source (français) du catalogue. */
  label: string
  tier: MasteryTier
  metric: string
  target: number
  earned: boolean
  /** Compteur courant, plafonné à `target`. */
  progress: number
  /** Date d'obtention (ISO-8601), `null` si le badge n'est pas acquis. */
  earnedAt: string | null
}

/** `GET /api/profiles/{id}/badges` : collection par famille. */
export interface BadgeCollectionView {
  earnedCount: number
  totalCount: number
  families: { family: BadgeFamily; badges: BadgeItemView[] }[]
}

/** `GET /api/profiles/{id}/activity` : série et jours joués (fenêtre de 365 jours par défaut). */
export interface ActivityView {
  userId: string
  currentStreak: number
  longestStreak: number
  /** `YYYY-MM-DD`, fuseau d'activité du profil. */
  lastActiveDate: string | null
  totalActiveDays: number
  days: { date: string; games: number }[]
}

/** `GET /api/me/rewards` : catalogue des récompenses (styles d'avatar). */
export interface RewardsView {
  rewards: {
    code: string
    unlocked: boolean
    unlockedAt: string | null
    source: string | null
    condition: { badgeCode: string; badgeLabel: string; target: number }
  }[]
}
