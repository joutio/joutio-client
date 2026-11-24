import type { QuestionEditorView } from '../types.js'
import type { QuestionOperation } from './question-draft.js'

/**
 * Applique exactement les champs envoyés à une question en cache (création comprise, datée de `now`) ; modifier une
 * question ne change pas sa modération dans le domaine.
 */
export function applyQuestionOperations(
  previous: QuestionEditorView | undefined,
  id: string,
  operations: readonly QuestionOperation[],
  now: string,
): QuestionEditorView | undefined {
  let question = previous
  for (const operation of operations) {
    if (operation.kind === 'create') {
      question = {
        questionId: id,
        ...operation.payload,
        status: 'PENDING',
        suspended: false,
        archived: false,
        openReportCount: 0,
        totalReportCount: 0,
        lastReportedAt: null,
        createdAt: now,
        updatedAt: null,
      }
    } else if (question) {
      if (operation.kind === 'imageUrl') question = { ...question, imageUrl: operation.imageUrl }
      else if (operation.kind === 'correctAnswer') question = { ...question, correctAnswer: operation.correctAnswer }
      else if (operation.kind === 'translation')
        question = {
          ...question,
          contents: [
            ...question.contents.filter((content) => content.language !== operation.language),
            {
              language: operation.language,
              text: operation.text,
              answers: operation.answers,
              imageAlt: operation.imageAlt,
            },
          ],
        }
      else
        question = {
          ...question,
          contents: question.contents.map((content) =>
            content.language !== operation.language
              ? content
              : operation.kind === 'text'
                ? { ...content, text: operation.text }
                : operation.kind === 'imageAlt'
                  ? { ...content, imageAlt: operation.imageAlt }
                  : { ...content, answers: operation.answers },
          ),
        }
    }
  }
  return question
}
