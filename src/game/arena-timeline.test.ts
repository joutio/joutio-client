import { describe, expect, it } from 'vitest'
import { sceneAt } from './arena-timeline.js'
import { applyGameNotification, emptyGame } from './game-fold.js'
import type { GameNotification } from './game-notification.js'
import { ANSWERS_APPEAR_MS, QUESTION_READ_MS, ROUND_SECONDS } from './game-constants.js'

const SHOWN = Date.parse('2026-11-11T10:00:00.000Z')
const REVEALED = SHOWN + QUESTION_READ_MS
const DEADLINE = REVEALED + ANSWERS_APPEAR_MS + ROUND_SECONDS * 1000
const iso = (ms: number) => new Date(ms).toISOString()

const notifications: GameNotification[] = [
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

const game = notifications.reduce(applyGameNotification, emptyGame('g1'))

function question(now: number) {
  const scene = sceneAt(game, now)
  if (scene.kind !== 'question') throw new Error(`scène ${scene.kind}`)
  return scene
}

describe('sceneAt, manche ouverte', () => {
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
