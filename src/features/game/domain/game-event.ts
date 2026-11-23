/** Événements côté client (partie), miroir de `GameEventResponse` en REST et STOMP. */

export type GameEventType =
  | 'GAME_CREATED'
  | 'GAME_STARTED'
  | 'ROUND_STARTED'
  | 'QUESTION_REVEALED'
  | 'PLAYER_ANSWERED'
  | 'ROUND_CLOSED'
  | 'GAME_FORFEITED'
  | 'GAME_ENDED'
  | 'GAME_CANCELLED'

export interface GameCreatedEvent {
  type: 'GAME_CREATED'
  gameId: string
  topicId: string
  player1Id: string
  player1Name: string | null
  player2Id: string | null
  player2Name: string | null
  player2Type: string | null
  botDifficulty: string | null
  /** Images des questions (dans l'ordre des rounds) : préchargées dès la création de la partie. */
  questionImageUrls: string[]
}

export interface GameStartedEvent {
  type: 'GAME_STARTED'
  gameId: string
  firstRoundAt: string
}

export interface RoundQuestionTranslation {
  text: string
  answers: Record<string, string>
  /** Description de l'image dans cette langue (lecteurs d'écran), `null` si absente. */
  imageAlt?: string | null
}

export interface RoundStartedEvent {
  type: 'ROUND_STARTED'
  gameId: string
  round: string
  questionId: string
  questionText: string
  imageUrl: string | null
  /** Description de l'image (repli FR, comme `questionText`), `null` si absente. */
  imageAlt?: string | null
  difficulty: string | null
  answers: Record<string, string>
  /** Contenus localisés (clé = code ISO 639-1 : fr, en). Absent sur les anciennes parties. */
  translations?: Record<string, RoundQuestionTranslation>
  bonus: boolean
  shownAt: string
  revealAt: string
}

export interface QuestionRevealedEvent {
  type: 'QUESTION_REVEALED'
  gameId: string
  round: string
  revealedAt: string
  answerDeadlineAt: string
}

export interface PlayerAnsweredEvent {
  type: 'PLAYER_ANSWERED'
  gameId: string
  round: string
  playerId: string
  choice: string
  correct: boolean
  pointsEarned: number
  answeredAt: string
  timeMs: number
}

export interface RoundClosedEvent {
  type: 'ROUND_CLOSED'
  gameId: string
  closedRound: string
  nextRound: string | null
  correctAnswer: string | null
  closedAt: string
  nextRoundAt: string | null
}

export interface GameForfeitedEvent {
  type: 'GAME_FORFEITED'
  gameId: string
  forfeiterId: string
}

export interface GameEndedEvent {
  type: 'GAME_ENDED'
  gameId: string
  winnerId: string | null
  player1FinalScore: number
  player2FinalScore: number
}

export interface GameCancelledEvent {
  type: 'GAME_CANCELLED'
  gameId: string
  reason: string
}

export type GameEvent =
  | GameCreatedEvent
  | GameStartedEvent
  | RoundStartedEvent
  | QuestionRevealedEvent
  | PlayerAnsweredEvent
  | RoundClosedEvent
  | GameForfeitedEvent
  | GameEndedEvent
  | GameCancelledEvent
