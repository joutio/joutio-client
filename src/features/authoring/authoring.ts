import type { Language } from '../../core/types/common.js'
import { QUESTION_CHOICES } from './types.js'
import type {
  QuestionContent,
  QuestionEditorView,
  QuestionReportReason,
  QuestionSort,
  OwnerQuestionReport,
  QuestionAction,
  ReportSnapshot,
  TopicPermissions,
  QuestionStatus,
  TopicTodo,
  WorkshopRole,
} from './types.js'

export const todoTotal = (todo: TopicTodo | undefined) => (todo ? todo.pending + todo.reportedQuestions : 0)

/** Le contenu signalé diffère de la question actuelle (texte, réponses ou bonne réponse, dans la langue du signalement). */
export function snapshotDiffers(question: QuestionEditorView, snapshot: ReportSnapshot | null | undefined): boolean {
  if (!snapshot?.questionText) return false
  const content = contentFor(question, (snapshot.language as Language | null) ?? 'fr') ?? contentFor(question, 'fr')
  if (!content) return true
  if (content.text !== snapshot.questionText || snapshot.correctAnswer !== question.correctAnswer) return true
  return QUESTION_CHOICES.some(
    (choice) =>
      content.answers.find((answer) => answer.choice === choice)?.text !==
      snapshot.answers.find((answer) => answer.choice === choice)?.text,
  )
}

/** Motifs des signalements ouverts, du plus cité au moins cité. */
export function reasonCounts(reports: readonly OwnerQuestionReport[]): [QuestionReportReason, number][] {
  const counts = new Map<QuestionReportReason, number>()
  for (const report of reports) for (const reason of report.reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

/** Rôle du joueur sur le sujet, pour les actions (`creation.md`, Tri, actions et rôles). */
export const workshopRole = (permissions: TopicPermissions | undefined): WorkshopRole =>
  permissions?.role === 'CREATOR' ? 'creator' : permissions?.canManage ? 'admin' : 'writer'

/**
 * Qui fait quoi sur une question : le créateur et les administrateurs archivent, restaurent et suppriment toute
 * question ; un rédacteur archive ou supprime **ses** questions en attente ou rejetées, rien d'autre.
 */
export function questionActions(
  role: WorkshopRole,
  question: Pick<QuestionEditorView, 'status' | 'creatorId'>,
  userId: string | undefined,
): QuestionAction[] {
  if (question.status === 'ARCHIVED') return role === 'writer' ? [] : ['restore', 'delete']
  if (role !== 'writer') return ['archive', 'delete']
  const mine = question.creatorId !== undefined && question.creatorId === userId
  return mine && (question.status === 'PENDING' || question.status === 'REJECTED') ? ['archive', 'delete'] : []
}

/** Statut affiché d'une question (`creation.md` § 1, Questions). */
export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  archived: 'Archivée',
  approved: 'Approuvée',
  pending: 'En attente de validation',
  suspended: 'Suspendue après signalements',
  rejected: 'Rejetée',
}

export function questionStatus(question: QuestionEditorView): QuestionStatus {
  if (question.status === 'ARCHIVED') return 'archived'
  if (question.status === 'SUSPENDED') return 'suspended'
  if (question.status === 'APPROVED') return 'approved'
  if (question.status === 'REJECTED') return 'rejected'
  return 'pending'
}

export function contentFor(question: QuestionEditorView, language: Language): QuestionContent | undefined {
  return question.contents.find((content) => content.language === language)
}

/**
 * Questions **jouables** d'un sujet : approuvées et rédigées dans sa meilleure langue. Une partie se
 * joue dans une langue, la publication exige donc `MIN_QUESTIONS` questions dans une même langue
 * (miroir de `countPlayableByTopicId`, joutio-theme).
 */
export function playableCount(questions: readonly QuestionEditorView[]): number {
  const perLanguage = new Map<Language, number>()
  for (const question of questions) {
    if (question.status !== 'APPROVED') continue
    for (const language of new Set(question.contents.map((content) => content.language))) {
      perLanguage.set(language, (perLanguage.get(language) ?? 0) + 1)
    }
  }
  return Math.max(0, ...perLanguage.values())
}

/** Une traduction anglaise complète existe. */
export const isTranslated = (question: QuestionEditorView) => contentFor(question, 'en') !== undefined

/** Texte d'une question dans la langue demandée, avec repli sur le français. */
export const questionText = (question: QuestionEditorView, language: Language = 'fr') =>
  (contentFor(question, language) ?? contentFor(question, 'fr') ?? question.contents[0])?.text ?? ''

export const REPORT_REASON_LABEL: Record<QuestionReportReason, string> = {
  QUESTION: "L'énoncé",
  IMAGE: "L'image",
  ANSWERS: 'Les réponses',
  COPYRIGHT: 'Droits d’auteur',
}

/** « L'énoncé, Les réponses ». */
export const reasonsLabel = (reasons: readonly QuestionReportReason[]) =>
  reasons.map((reason) => REPORT_REASON_LABEL[reason]).join(', ')

/** Tris de la liste Questions (`creation.md`). « Plus signalées » n'existe qu'une fois le sujet publié. */
export function sortQuestions(questions: readonly QuestionEditorView[], sort: QuestionSort): QuestionEditorView[] {
  const recent = [...questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (sort === 'Plus anciennes') return recent.reverse()
  if (sort === 'Plus signalées') return recent.sort((a, b) => b.openReportCount - a.openReportCount)
  if (sort === 'Ordre alphabétique')
    return [...questions].sort((a, b) => questionText(a).localeCompare(questionText(b), 'fr'))
  return recent
}
