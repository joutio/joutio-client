import { describe, expect, it } from 'vitest'
import { Arena } from '../domain/arena.js'
import { Game } from '../domain/game.js'
import type { GameEvent } from '../domain/game-event.js'
import { ANSWERS_APPEAR_MS, QUESTION_READ_MS, ROUND_SECONDS } from '../domain/game-constants.js'

const SHOWN = Date.parse('2026-11-11T10:00:00.000Z')
const REVEALED = SHOWN + QUESTION_READ_MS
const DEADLINE = REVEALED + ANSWERS_APPEAR_MS + ROUND_SECONDS * 1000
const iso = (ms: number) => new Date(ms).toISOString()

const events: GameEvent[] = [
  {
    type: 'ROUND_STARTED',
    gameId: 'g1',
    round: '0',
    questionId: 'q1',
    questionText: 'Qui fut surnommé le Roi-Soleil ?',
    imageUrl: null,
    difficulty: 'EASY',
    answers: { A: 'Louis XIII', B: 'Louis XIV', C: 'Louis XV', D: 'Henri IV' },
    translations: {},
    bonus: false,
    shownAt: iso(SHOWN),
    revealAt: iso(REVEALED),
  },
  { type: 'QUESTION_REVEALED', gameId: 'g1', round: '0', revealedAt: iso(REVEALED), answerDeadlineAt: iso(DEADLINE) },
]

const game = events.reduce((game, event) => game.onGameEvent(event), Game.empty('g1'))

function question(now: number) {
  const scene = new Arena(game).sceneAt(now)
  if (scene.kind !== 'question') throw new Error(`scène ${scene.kind}`)
  return scene
}

describe('Arena.sceneAt, manche ouverte', () => {
  it('verrouille la question pendant la lecture, chrono plein et arrêté', () => {
    const scene = question(SHOWN + 500)
    expect(scene.locked).toBe(true)
    expect(scene.timerRunning).toBe(false)
    expect(scene.timeLeft).toBe(ROUND_SECONDS)
  })

  it("ouvre les réponses à la révélation sans lancer le chrono pendant l'apparition", () => {
    const scene = question(REVEALED + ANSWERS_APPEAR_MS - 1)
    expect(scene.locked).toBe(false)
    expect(scene.timerRunning).toBe(false)
    expect(scene.timeLeft).toBe(ROUND_SECONDS)
  })

  it("lance le chrono à la fin de l'apparition", () => {
    const start = REVEALED + ANSWERS_APPEAR_MS
    expect(question(start).timerRunning).toBe(true)
    expect(question(start + 2500).timeLeft).toBeCloseTo(7.5)
  })

  it("tombe à 0 à l'échéance serveur", () => {
    const scene = question(DEADLINE)
    expect(scene.timerRunning).toBe(true)
    expect(scene.timeLeft).toBe(0)
  })
})
