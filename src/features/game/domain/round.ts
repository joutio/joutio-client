import { ANSWERS_APPEAR_MS, ROUND_SECONDS } from './game-constants.js'
import type { GameRoundState } from '../types.js'

/**
 * Sémantique d'une manche, partagée par les deux apps : texte localisé, position du premier à
 * répondre sur la barre du chrono, échéance de réponse.
 */

/**
 * Résout le texte, les réponses et la description de l'image dans la langue du joueur, avec repli sur la langue
 * source (langue absente du snapshot ou ancienne partie sans traductions). `imageAlt` vide : image décorative.
 */
export function localizedQuestion(round: GameRoundState | null | undefined, language: string): { questionText: string; answers: Record<string, string>; imageAlt: string } {
  if (!round) {
    return { questionText: '', answers: {}, imageAlt: '' }
  }
  const translation = round.translations[language]
  return {
    questionText: translation?.text ?? round.questionText,
    answers: translation?.answers ?? round.answers,
    imageAlt: translation?.imageAlt ?? round.imageAlt ?? '',
  }
}

/**
 * Position (0–100) sur la timeline du chrono où le premier joueur a répondu (le plus rapide de
 * la manche) — repère « premier à répondre » de la barre du timer. `null` si personne n'a répondu.
 */
export function firstAnswerPct(round: GameRoundState | null): number | null {
  if (!round) return null
  const times = Object.values(round.playerAnswers).map((answer) => answer.timeMs)
  if (times.length === 0) return null
  const fastest = Math.min(...times)
  // Le temps compte depuis la révélation ; la barre ne part qu'après l'apparition des réponses.
  const pct = (1 - (fastest - ANSWERS_APPEAR_MS) / (ROUND_SECONDS * 1000)) * 100
  return Math.min(100, Math.max(0, pct))
}

/**
 * Deadline de réponse d'un round (ms epoch) : l'échéance autoritaire `answerDeadlineAt` si le
 * serveur l'a poussée, sinon une projection `revealAt + ANSWERS_APPEAR_MS + ROUND_SECONDS`
 * (`GameAggregate`). Permet au décompte de démarrer à l'heure même quand la
 * trame `QUESTION_REVEALED` est en retard sur une connexion faible.
 */
export function answerDeadlineMs(round: GameRoundState | null | undefined): number | null {
  if (!round) return null
  if (round.answerDeadlineAt) {
    const parsed = Date.parse(round.answerDeadlineAt)
    if (Number.isFinite(parsed)) return parsed
  }
  if (round.revealAt) {
    const revealAt = Date.parse(round.revealAt)
    if (Number.isFinite(revealAt)) return revealAt + ANSWERS_APPEAR_MS + ROUND_SECONDS * 1000
  }
  return null
}
