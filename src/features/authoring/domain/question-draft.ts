import type { Language } from '../../../types/common.js'
import { contentFor } from '../authoring.js'
import { QUESTION_CHOICES, type CreateQuestionInput, type QuestionAnswer, type QuestionChoice, type QuestionEditorView } from '../types.js'

export type Localized = Record<Language, string>
const EMPTY_ANSWERS = ['', '', '', ''] as const

/**
 * Brouillon de l'éditeur de question (`creation.md` § 2) : question, quatre réponses et description de l'image (`alt`)
 * par langue ; bonne réponse et image communes.
 */
export interface QuestionDraft {
  texts: Localized
  answers: Record<Language, readonly string[]>
  /** Index de la bonne réponse, absent tant qu'elle n'est pas choisie. */
  correct?: number
  /** URL publique de l'image (après envoi), ou absente. */
  imageUrl?: string
  alt: Localized
}

export type TranslationStatus = 'none' | 'partial' | 'complete'

export const TRANSLATION_STATUS_LABEL: Record<TranslationStatus, string> = { none: 'Facultative', partial: 'À terminer', complete: 'Complète' }

export function emptyDraft(): QuestionDraft {
  return { texts: { fr: '', en: '' }, answers: { fr: EMPTY_ANSWERS, en: EMPTY_ANSWERS }, alt: { fr: '', en: '' } }
}

function answersFor(question: QuestionEditorView, language: Language): readonly string[] {
  const content = contentFor(question, language)
  return QUESTION_CHOICES.map((choice) => content?.answers.find((answer) => answer.choice === choice)?.text ?? '')
}

export function draftFromQuestion(question: QuestionEditorView): QuestionDraft {
  return {
    texts: { fr: contentFor(question, 'fr')?.text ?? '', en: contentFor(question, 'en')?.text ?? '' },
    answers: { fr: answersFor(question, 'fr'), en: answersFor(question, 'en') },
    correct: QUESTION_CHOICES.indexOf(question.correctAnswer),
    imageUrl: question.imageUrl ?? undefined,
    alt: { fr: contentFor(question, 'fr')?.imageAlt ?? '', en: contentFor(question, 'en')?.imageAlt ?? '' },
  }
}

function filledCount(values: readonly string[]) {
  return values.filter((value) => value.trim() !== '').length
}

/** Anglais : rien, commencé, ou complet (question, quatre réponses et, avec une image, sa description). */
export function translationStatus(draft: QuestionDraft): TranslationStatus {
  const values = [draft.texts.en, ...draft.answers.en, ...(draft.imageUrl ? [draft.alt.en] : [])]
  const filled = filledCount(values)
  return filled === 0 ? 'none' : filled === values.length ? 'complete' : 'partial'
}

/** Français complet : question et quatre réponses. */
export const frenchFilled = (draft: QuestionDraft) => draft.texts.fr.trim() !== '' && filledCount(draft.answers.fr) === 4

/**
 * Description d'image manquante : exigée en français pour une image **choisie dans cet éditeur**. Une image déjà
 * enregistrée sans description (questions antérieures, seed) ne bloque pas la modification du reste.
 */
export const missingAlt = (draft: QuestionDraft, imageChanged: boolean) => Boolean(draft.imageUrl) && imageChanged && draft.alt.fr.trim() === ''

export function isReady(draft: QuestionDraft, imageChanged: boolean) {
  return frenchFilled(draft) && draft.correct !== undefined && translationStatus(draft) !== 'partial' && !missingAlt(draft, imageChanged)
}

const choiceAt = (index: number): QuestionChoice => QUESTION_CHOICES[index] ?? 'A'

function answersOf(draft: QuestionDraft, language: Language): QuestionAnswer[] {
  return QUESTION_CHOICES.map((choice, index) => ({ choice, text: (draft.answers[language][index] ?? '').trim() }))
}

function languages(draft: QuestionDraft): Language[] {
  return translationStatus(draft) === 'complete' ? ['fr', 'en'] : ['fr']
}

/** Description envoyée pour une langue : `null` sans image ou vide. */
function altOf(draft: QuestionDraft, language: Language): string | null {
  const alt = draft.alt[language].trim()
  return draft.imageUrl && alt !== '' ? alt : null
}

export function toCreateInput(draft: QuestionDraft): CreateQuestionInput {
  return {
    contents: languages(draft).map((language) => ({ language, text: draft.texts[language].trim(), answers: answersOf(draft, language), imageAlt: altOf(draft, language) })),
    correctAnswer: choiceAt(draft.correct ?? 0),
    imageUrl: draft.imageUrl ?? null,
  }
}

/** Écritures d'une question : une commande par champ côté BFF ; une langue nouvelle passe par une traduction complète. */
export type QuestionOperation =
  | { kind: 'create'; payload: CreateQuestionInput }
  | { kind: 'translation'; language: Language; text: string; answers: QuestionAnswer[]; imageAlt: string | null }
  | { kind: 'text'; language: Language; text: string }
  | { kind: 'answers'; language: Language; answers: QuestionAnswer[] }
  | { kind: 'correctAnswer'; correctAnswer: QuestionChoice }
  | { kind: 'imageUrl'; imageUrl: string | null }
  | { kind: 'imageAlt'; language: Language; imageAlt: string | null }

const sameAnswers = (next: readonly QuestionAnswer[], previous: readonly QuestionAnswer[]) =>
  next.every((answer) => previous.find((item) => item.choice === answer.choice)?.text === answer.text)

/**
 * Opérations à envoyer pour passer de `original` au brouillon ; seules les valeurs modifiées partent. Vider
 * l'anglais d'une question déjà traduite ne la retire pas (aucun endpoint de suppression de traduction).
 */
export function buildQuestionPlan(original: QuestionEditorView | undefined, draft: QuestionDraft): QuestionOperation[] {
  if (!original) return [{ kind: 'create', payload: toCreateInput(draft) }]
  const operations: QuestionOperation[] = []
  for (const language of languages(draft)) {
    const content = contentFor(original, language)
    const text = draft.texts[language].trim()
    const answers = answersOf(draft, language)
    const imageAlt = altOf(draft, language)
    if (!content) {
      operations.push({ kind: 'translation', language, text, answers, imageAlt })
      continue
    }
    if (content.text !== text) operations.push({ kind: 'text', language, text })
    if (!sameAnswers(answers, content.answers)) operations.push({ kind: 'answers', language, answers })
    if ((content.imageAlt ?? null) !== imageAlt) operations.push({ kind: 'imageAlt', language, imageAlt })
  }
  const correctAnswer = choiceAt(draft.correct ?? 0)
  if (original.correctAnswer !== correctAnswer) operations.push({ kind: 'correctAnswer', correctAnswer })
  const imageUrl = draft.imageUrl ?? null
  if ((original.imageUrl ?? null) !== imageUrl) operations.push({ kind: 'imageUrl', imageUrl })
  return operations
}
