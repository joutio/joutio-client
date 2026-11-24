import type { QueryClient } from '@tanstack/react-query'
import { change, changeFields, nothingToUndo, removeFrom, undoAll, type Undo } from '../../../core/query/optimistic.js'
import { changeTopicFields } from '../../topics/cache/topic-card.js'
import { applyQuestionOperations } from '../domain/question-cache.js'
import type { QuestionOperation } from '../domain/question-draft.js'
import { authoringKeys } from '../query/keys.js'
import type { QuestionEditorView, TopicTodo } from '../types.js'

/** Seuil de questions approuvées sous lequel un sujet publié repasse en brouillon. */
export const MIN_APPROVED_QUESTIONS = 7

const isQuestion = (questionId: string) => (question: QuestionEditorView) => question.questionId === questionId

/** Ajoute `delta` aux compteurs « À traiter » d'un sujet ; l'inverse retranche le même delta. */
export function shiftTodo(
  client: QueryClient,
  topicId: string,
  delta: Partial<Pick<TopicTodo, 'pending' | 'reportedQuestions'>>,
): Undo {
  const shift = (sign: 1 | -1) => (items: TopicTodo[]) =>
    items.map((todo) =>
      todo.topicId === topicId
        ? {
            ...todo,
            pending: Math.max(0, todo.pending + sign * (delta.pending ?? 0)),
            reportedQuestions: Math.max(0, todo.reportedQuestions + sign * (delta.reportedQuestions ?? 0)),
          }
        : todo,
    )
  return change(client, { queryKey: authoringKeys.todo(), exact: true }, shift(1), shift(-1))
}

/** Change des champs d'une question en cache ; l'inverse ne touche que ces champs, s'ils n'ont pas changé depuis. */
export function changeQuestion(
  client: QueryClient,
  topicId: string,
  questionId: string,
  fields: Partial<QuestionEditorView>,
): Undo {
  const before = client.getQueryData(authoringKeys.questions(topicId))?.find(isQuestion(questionId))
  if (!before) return nothingToUndo
  const previous = Object.fromEntries(Object.keys(fields).map((key) => [key, before[key as keyof QuestionEditorView]]))
  return change(
    client,
    { queryKey: authoringKeys.questions(topicId), exact: true },
    (questions) =>
      questions.map((question) => (isQuestion(questionId)(question) ? { ...question, ...fields } : question)),
    (questions) =>
      questions.map((question) => {
        if (!isQuestion(questionId)(question)) return question
        const unchanged = Object.keys(fields).filter(
          (key) => question[key as keyof QuestionEditorView] === fields[key as keyof QuestionEditorView],
        )
        return { ...question, ...Object.fromEntries(unchanged.map((key) => [key, previous[key]])) }
      }),
  )
}

/** Applique des opérations d'édition à une question en cache (création comprise) ; l'inverse remet la question d'avant. */
export function applyOperations(
  client: QueryClient,
  topicId: string,
  questionId: string,
  operations: readonly QuestionOperation[],
  now: string,
): Undo {
  const key = authoringKeys.questions(topicId)
  const before = client.getQueryData(key)?.find(isQuestion(questionId))
  const next = applyQuestionOperations(before, questionId, operations, now)
  if (!next) return nothingToUndo
  client.setQueryData(key, (questions) =>
    questions?.some(isQuestion(questionId))
      ? questions.map((question) => (isQuestion(questionId)(question) ? next : question))
      : [next, ...(questions ?? [])],
  )
  return () =>
    client.setQueryData(key, (questions) =>
      before
        ? questions?.map((question) => (question === next ? before : question))
        : questions?.filter((question) => question !== next),
    )
}

/** Retire une question de la liste ; l'inverse la remet à sa place. */
export function removeQuestion(client: QueryClient, topicId: string, questionId: string): Undo {
  const key = authoringKeys.questions(topicId)
  const questions = client.getQueryData(key)
  if (!questions) return nothingToUndo
  const removal = removeFrom(questions, isQuestion(questionId))
  client.setQueryData(key, removal.items)
  return () => client.setQueryData(key, (current) => (current ? removal.restore(current) : current))
}

/**
 * Recalcule le compteur de questions approuvées de la carte du sujet depuis les questions en cache ; sous 7, un sujet
 * publié repasse en brouillon quand `draftBelowMinimum`.
 */
export function syncApproved(client: QueryClient, topicId: string, draftBelowMinimum = false): Undo {
  const questions = client.getQueryData(authoringKeys.questions(topicId))
  if (!questions) return nothingToUndo
  const approved = questions.filter((question) => question.status === 'APPROVED').length
  return changeTopicFields(client, topicId, {
    questionsCount: approved,
    ...(draftBelowMinimum && approved < MIN_APPROVED_QUESTIONS ? { status: 'DRAFT' as const } : {}),
  })
}

/** Sort une question de la file des signalements : file, compteur « À traiter » et signalements ouverts de la question. */
export function dropFromQueue(client: QueryClient, topicId: string, questionId: string): Undo {
  const key = authoringKeys.reports(topicId)
  const queue = client.getQueryData(key)
  const removal = queue ? removeFrom(queue, (item) => item.question.questionId === questionId) : undefined
  if (removal) client.setQueryData(key, removal.items)
  const listed = removal !== undefined && queue !== undefined && removal.items.length < queue.length
  return undoAll([
    listed ? shiftTodo(client, topicId, { reportedQuestions: -1 }) : nothingToUndo,
    removal
      ? () => client.setQueryData(key, (current) => (current ? removal.restore(current) : current))
      : nothingToUndo,
    changeQuestion(client, topicId, questionId, { openReportCount: 0 }),
  ])
}

/** Change des champs de l'atelier d'un sujet (titres…) ; l'inverse ne touche que ces champs. */
export const changeWorkshop = (client: QueryClient, topicId: string, fields: Parameters<typeof changeFields>[2]) =>
  changeFields(client, authoringKeys.workshop(topicId), fields)
