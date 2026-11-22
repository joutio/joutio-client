import type {
  GameCancelledEvent,
  GameCreatedEvent,
  GameEndedEvent,
  GameEvent,
  GameForfeitedEvent,
  GameStartedEvent,
  PlayerAnsweredEvent,
  QuestionRevealedEvent,
  RoundClosedEvent,
  RoundStartedEvent,
} from './game-event.js'
import type { GameRoundState, GameState } from '../types.js'

/**
 * Modèle client d'une partie : l'état **réagit** aux `GameEvent` (historique REST + push WebSocket,
 * dédupliqués en amont par `sequenceNumber`). Chaque événement a sa méthode (`onGameStarted`,
 * `onRoundStarted`…) et renvoie une nouvelle instance immuable — le serveur reste autoritaire, le
 * client projette ses événements et n'en émet aucun.
 */
export class Game implements GameState {
  declare readonly gameId: string
  declare readonly topicId: string | null
  declare readonly player1Id: string | null
  declare readonly player1Name: string | null
  declare readonly player2Id: string | null
  declare readonly player2Name: string | null
  declare readonly player2Type: string | null
  declare readonly botDifficulty: string | null
  declare readonly questionImageUrls: string[]
  declare readonly firstRoundAt: string | null
  declare readonly status: GameState['status']
  declare readonly rounds: Record<string, GameRoundState>
  declare readonly player1Score: number
  declare readonly player2Score: number
  declare readonly winnerId: string | null
  declare readonly forfeiterId: string | null
  declare readonly canceledReason: string | null

  private constructor(fields: GameState) {
    Object.assign(this, fields)
  }

  /** État initial d'une partie, avant le premier événement (écran en attente d'historique). */
  static empty(gameId: string): Game {
    return new Game({
      gameId,
      topicId: null,
      player1Id: null,
      player1Name: null,
      player2Id: null,
      player2Name: null,
      player2Type: null,
      botDifficulty: null,
      questionImageUrls: [],
      firstRoundAt: null,
      status: 'IN_PROGRESS',
      rounds: {},
      player1Score: 0,
      player2Score: 0,
      winnerId: null,
      forfeiterId: null,
      canceledReason: null,
    })
  }

  /** Réagit à un événement du bus : renvoie la partie suivante (application idempotente). */
  onGameEvent(event: GameEvent): Game {
    switch (event.type) {
      case 'GAME_CREATED':
        return this.onGameCreated(event)
      case 'GAME_STARTED':
        return this.onGameStarted(event)
      case 'ROUND_STARTED':
        return this.onRoundStarted(event)
      case 'QUESTION_REVEALED':
        return this.onQuestionRevealed(event)
      case 'PLAYER_ANSWERED':
        return this.onPlayerAnswered(event)
      case 'ROUND_CLOSED':
        return this.onRoundClosed(event)
      case 'GAME_FORFEITED':
        return this.onGameForfeited(event)
      case 'GAME_ENDED':
        return this.onGameEnded(event)
      case 'GAME_CANCELLED':
        return this.onGameCancelled(event)
    }
  }

  private copyWith(patch: Partial<GameState>): Game {
    return new Game(Object.assign({}, this, patch))
  }

  private roundWith(round: string, update: (current: GameRoundState) => GameRoundState): Game {
    const current = this.rounds[round] ?? emptyRound(round)
    return this.copyWith({ rounds: { ...this.rounds, [round]: update(current) } })
  }

  private onGameCreated(event: GameCreatedEvent): Game {
    return this.copyWith({
      topicId: event.topicId,
      player1Id: event.player1Id,
      player1Name: event.player1Name,
      player2Id: event.player2Id,
      player2Name: event.player2Name,
      player2Type: event.player2Type,
      botDifficulty: event.botDifficulty,
      questionImageUrls: event.questionImageUrls ?? [],
      status: 'IN_PROGRESS',
    })
  }

  private onGameStarted(event: GameStartedEvent): Game {
    return this.copyWith({ status: 'IN_PROGRESS', firstRoundAt: event.firstRoundAt })
  }

  private onRoundStarted(event: RoundStartedEvent): Game {
    return this.roundWith(event.round, (round) => ({
      ...round,
      questionId: event.questionId,
      questionText: event.questionText,
      imageUrl: event.imageUrl ?? null,
      imageAlt: event.imageAlt ?? null,
      difficulty: event.difficulty ?? null,
      answers: event.answers,
      translations: event.translations ?? {},
      bonus: event.bonus,
      phase: 'QUESTION_SHOWN',
      shownAt: event.shownAt,
      revealAt: event.revealAt,
    }))
  }

  private onQuestionRevealed(event: QuestionRevealedEvent): Game {
    return this.roundWith(event.round, (round) => ({
      ...round,
      phase: 'ANSWERABLE',
      revealedAt: event.revealedAt,
      answerDeadlineAt: event.answerDeadlineAt,
    }))
  }

  private onPlayerAnswered(event: PlayerAnsweredEvent): Game {
    const isPlayer1 = event.playerId === this.player1Id
    return this.roundWith(event.round, (round) => ({
      ...round,
      playerAnswers: {
        ...round.playerAnswers,
        [event.playerId]: {
          choice: event.choice,
          correct: event.correct,
          points: event.pointsEarned,
          timeMs: event.timeMs,
        },
      },
    })).copyWith({
      player1Score: isPlayer1 ? this.player1Score + event.pointsEarned : this.player1Score,
      player2Score: isPlayer1 ? this.player2Score : this.player2Score + event.pointsEarned,
    })
  }

  private onRoundClosed(event: RoundClosedEvent): Game {
    return this.roundWith(event.closedRound, (round) => ({
      ...round,
      phase: 'CLOSED',
      correctAnswer: event.correctAnswer,
      closedAt: event.closedAt,
      nextRoundAt: event.nextRoundAt,
    }))
  }

  private onGameForfeited(event: GameForfeitedEvent): Game {
    return this.copyWith({ forfeiterId: event.forfeiterId })
  }

  private onGameEnded(event: GameEndedEvent): Game {
    return this.copyWith({
      status: 'FINISHED',
      winnerId: event.winnerId,
      player1Score: event.player1FinalScore,
      player2Score: event.player2FinalScore,
    })
  }

  private onGameCancelled(event: GameCancelledEvent): Game {
    return this.copyWith({ status: 'CANCELED', canceledReason: event.reason })
  }
}

function emptyRound(round: string): GameRoundState {
  return {
    round,
    questionId: null,
    questionText: '',
    imageUrl: null,
    imageAlt: null,
    difficulty: null,
    answers: {},
    translations: {},
    bonus: false,
    phase: 'QUESTION_SHOWN',
    shownAt: null,
    revealAt: null,
    revealedAt: null,
    answerDeadlineAt: null,
    closedAt: null,
    nextRoundAt: null,
    correctAnswer: null,
    playerAnswers: {},
  }
}
