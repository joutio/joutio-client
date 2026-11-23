import type { BadgeView } from '../profile/types.js'
import type { UserRefView } from '../profile/types.js'
import type { TopicRefView } from '../topics/types.js'
import type { RoundQuestionTranslation } from './domain/game-event.js'

export type GameStatus = 'IN_PROGRESS' | 'FINISHED' | 'CANCELED'

export type GameRoundPhase = 'QUESTION_SHOWN' | 'ANSWERABLE' | 'CLOSED'

export interface PlayerAnswer {
  choice: string
  correct: boolean
  points: number
  timeMs: number
}

export interface GameRoundState {
  round: string
  questionId: string | null
  questionText: string
  imageUrl: string | null
  imageAlt: string | null
  difficulty: string | null
  answers: Record<string, string>
  translations: Record<string, RoundQuestionTranslation>
  bonus: boolean
  phase: GameRoundPhase
  shownAt: string | null
  revealAt: string | null
  revealedAt: string | null
  answerDeadlineAt: string | null
  closedAt: string | null
  nextRoundAt: string | null
  correctAnswer: string | null
  playerAnswers: Record<string, PlayerAnswer>
}

/** Données pures d'une partie : la forme de l'état porté par `Game`. */
export interface GameState {
  gameId: string
  topicId: string | null
  player1Id: string | null
  player1Name: string | null
  player2Id: string | null
  player2Name: string | null
  player2Type: string | null
  botDifficulty: string | null
  /** Images des questions (ordre des rounds), préchargées dès la création de la partie. */
  questionImageUrls: string[]
  /** Instant serveur du premier round (intro VS/swoosh recalée dessus). */
  firstRoundAt: string | null
  status: GameStatus
  rounds: Record<string, GameRoundState>
  player1Score: number
  player2Score: number
  winnerId: string | null
  forfeiterId: string | null
  canceledReason: string | null
}

/** Choix de réponse à une question (enum backend `GameQuestionChoice`). */
export type GameChoice = 'A' | 'B' | 'C' | 'D'

/** `POST /api/games/{id}/answer` : `clientElapsedMs` est borné par le serveur. */
export interface AnswerQuestionCommand {
  round: number
  choice: GameChoice
  clientElapsedMs: number
}

/** Garde de type : le choix reçu (clic, payload) est un choix de réponse valide. */
export function isGameChoice(value: string): value is GameChoice {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D'
}

/** Difficulté d'un bot (enum backend `BotDifficulty`). */
export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD'

export type GamePlayerType = 'HUMAN' | 'BOT'

export type ActiveGameStatus = 'IN_PROGRESS'

export type GameOutcome = 'WIN' | 'LOSS' | 'DRAW' | 'WAITING' | 'IN_PROGRESS' | 'CANCELLED'

/**
 * Partie en cours du joueur (`ActiveGameView`) — bannière « Rejoindre ».
 * `opponent` vaut `null` pour un duel contre le bot.
 */
export interface ActiveGameView {
  gameId: string
  topic: TopicRefView
  opponent: UserRefView | null
  opponentType: GamePlayerType
  status: ActiveGameStatus
  createdAt: string
}

/** Récompense d'un duel terminé (`GameResultView.reward`) — `null` tant qu'elle est calculée. */
export interface GameResultReward {
  xp: number
  victoryBonus: number
}

/**
 * Manche rejouable de l'écran résultat, dans l'ordre autoritaire du serveur (manches closes).
 * La question est un snapshot figé au moment de la partie (réponses, traductions, image).
 */
export interface GameResultRoundView {
  /** Nom de la manche (`ROUND_1`…`ROUND_7`). */
  round: string
  questionText: string
  answers: Record<string, string>
  translations: Record<string, RoundQuestionTranslation>
  imageUrl: string | null
  imageAlt: string | null
  bonus: boolean
  correctAnswer: string | null
  /** Réponse du joueur demandeur (null : non répondu, forfait). */
  myAnswer: PlayerAnswer | null
  /** Réponse de l'adversaire (null : bot, absent, forfait). */
  opponentAnswer: PlayerAnswer | null
}

/**
 * Vue de résultat d'un duel (`GET /api/games/{gameId}/result`) : bilan autoritaire de la partie,
 * progression du joueur après récompense et enrichissements (sujet + adversaire) pour la page
 * résultat. `reward` arrive après la projection (poll court).
 */
export interface GameResultView {
  myScore: number
  opponentScore: number
  winnerId: string | null
  botGame: boolean
  basePoints: number
  speedBonus: number
  correctAnswers: number
  fastAnswers: number
  answeredRounds: number
  totalRounds: number
  reward: GameResultReward | null
  progression: {
    /** Elo global à l'issue de la partie. */
    rating: number
    peakRating: number
    ratedGames: number
  }
  /** Maîtrise du sujet après la partie (XP dans le sujet, gain, palier). */
  topicMastery: {
    xp: number
    xpGained: number
    tier: string
    nextTier: string | null
    tierProgressPercent: number
    tierRemainingXp: number
  }
  /** Variation d'Elo du joueur et de l'adversaire (0 si non classé). */
  eloDelta?: number
  rated?: boolean
  opponentRating?: number
  opponentEloDelta?: number
  opponentRated?: boolean
  topic: TopicRefView
  opponent: UserRefView | null
  opponentId: string | null
  botDifficulty: BotDifficulty | null
  /** Compte adversaire supprimé : identité masquée, pas de profil/revanche/signalement. */
  opponentDeleted: boolean
  /**
   * Badges débloqués par la partie, dans l'ordre d'obtention (séquence du résultat, après les titres). Vide tant que
   * la projection ne les a pas écrits : l'achievement STOMP portant ce `gameId` fait relire le résultat.
   */
  badges: BadgeView[]
  /** Manches closes dans l'ordre, avec le snapshot de question (revue des manches). */
  rounds: GameResultRoundView[]
}
