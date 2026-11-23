import type { AbortSignalLike, HttpClient } from '../../../core/http.js'
import { segment } from '../../../core/http.js'
import type { IdResponse } from '../../../core/types/common.js'
import type { TeamMember } from '../types.js'
import type { QuestionOperation } from '../domain/question-draft.js'
import type {
  CreateTopicCommand,
  QuestionReportRequest,
  RejectQuestionCommand,
  ResolveReportsCommand,
  SetMemberCommand,
  UpdateTopicCategoryCommand,
  UpdateTopicDescriptionCommand,
  UpdateTopicImageUrlCommand,
  UpdateTopicNameCommand,
  UpdateTopicPictogramUrlCommand,
  UpdateTopicTitlesCommand,
  UserReportRequest,
} from '../types.js'

/** Écritures d'auteur (`creation.md` § 5) : sujets champ par champ, questions, équipe et modération. */

/** Crée un brouillon de sujet : `id` renvoyé. */
export async function createTopic(http: HttpClient, command: CreateTopicCommand, signal?: AbortSignalLike): Promise<IdResponse> {
  return http.post<IdResponse>('/api/topics', { body: command, signal })
}

export async function updateTopicName(http: HttpClient, topicId: string, command: UpdateTopicNameCommand, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/name`, { body: command, signal })
}

export async function updateTopicCategory(http: HttpClient, topicId: string, command: UpdateTopicCategoryCommand, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/category`, { body: command, signal })
}

export async function updateTopicImageUrl(http: HttpClient, topicId: string, command: UpdateTopicImageUrlCommand, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/image-url`, { body: command, signal })
}

export async function updateTopicPictogramUrl(http: HttpClient, topicId: string, command: UpdateTopicPictogramUrlCommand, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/pictogram-url`, { body: command, signal })
}

export async function updateTopicDescription(http: HttpClient, topicId: string, command: UpdateTopicDescriptionCommand, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/description`, { body: command, signal })
}

/** Titres par palier ; `titles` à `null` efface tout (repli « Or · Sujet »). */
export async function updateTopicTitles(http: HttpClient, topicId: string, command: UpdateTopicTitlesCommand, signal?: AbortSignalLike): Promise<void> {
  return http.put<void>(`/api/topics/${segment(topicId)}/titles`, { body: command, signal })
}

/** Publie le sujet. */
export async function publishTopic(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/topics/${segment(topicId)}/publish`, { signal })
}

/** Repasse le sujet en brouillon. */
export async function draftTopic(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/topics/${segment(topicId)}/draft`, { signal })
}

/** Supprime un brouillon (créateur seul) ; ses questions partent avec lui. */
export async function deleteTopic(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>(`/api/topics/${segment(topicId)}`, { signal })
}

/**
 * Envoie les opérations du plan de modifications dans l'ordre ; renvoie l'identifiant de la
 * question (créée ou modifiée). En cas d'échec partiel, l'erreur porte les opérations déjà
 * envoyées (`completedOperations`) et l'identifiant éventuel.
 */
export async function saveQuestion(http: HttpClient, topicId: string, questionId: string | undefined, operations: readonly QuestionOperation[]): Promise<string> {
  let id = questionId
  const completed: QuestionOperation[] = []
  try {
    for (const operation of operations) {
      switch (operation.kind) {
        case 'create':
          id = (await http.post<IdResponse>(`/api/topics/${segment(topicId)}/questions`, { body: operation.payload })).id
          break
        case 'translation':
          await http.post<void>(`/api/questions/${segment(id ?? '')}/translations`, {
            body: { language: operation.language, text: operation.text, answers: operation.answers, imageAlt: operation.imageAlt },
          })
          break
        case 'text':
          await http.put<void>(`/api/questions/${segment(id ?? '')}/text`, { body: { language: operation.language, text: operation.text } })
          break
        case 'answers':
          await http.put<void>(`/api/questions/${segment(id ?? '')}/answers`, { body: { language: operation.language, answers: operation.answers } })
          break
        case 'correctAnswer':
          await http.put<void>(`/api/questions/${segment(id ?? '')}/correct-answer`, { body: { correctAnswer: operation.correctAnswer } })
          break
        case 'imageUrl':
          await http.put<void>(`/api/questions/${segment(id ?? '')}/image-url`, { body: { imageUrl: operation.imageUrl } })
          break
        case 'imageAlt':
          await http.put<void>(`/api/questions/${segment(id ?? '')}/image-alt`, { body: { language: operation.language, imageAlt: operation.imageAlt } })
          break
      }
      completed.push(operation)
    }
    if (questionId && operations.length > 0) await http.post<void>(`/api/questions/${segment(questionId)}/resubmit`)
  } catch (cause) {
    throw Object.assign(new Error('partial question save', { cause }), { questionId: id, completedOperations: completed })
  }
  return id ?? ''
}

export async function deleteQuestion(http: HttpClient, questionId: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>(`/api/questions/${segment(questionId)}`, { signal })
}

export async function archiveQuestion(http: HttpClient, questionId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/questions/${segment(questionId)}/archive`, { signal })
}

export async function restoreQuestion(http: HttpClient, questionId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/questions/${segment(questionId)}/restore`, { signal })
}

export async function approveQuestion(http: HttpClient, questionId: string, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/questions/${segment(questionId)}/approve`, { signal })
}

export async function rejectQuestion(http: HttpClient, questionId: string, command: RejectQuestionCommand, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/questions/${segment(questionId)}/reject`, { body: command, signal })
}

/** Clôt tous les signalements ouverts d'une question : `RESOLVED` après modification, `DISMISSED` sinon. */
export async function resolveQuestionReports(
  http: HttpClient,
  questionId: string,
  command: ResolveReportsCommand,
  signal?: AbortSignalLike,
): Promise<{ resolvedCount: number }> {
  return http.post<{ resolvedCount: number }>(`/api/questions/${segment(questionId)}/reports/resolve`, { body: command, signal })
}

export async function setTeamMember(http: HttpClient, topicId: string, userId: string, command: SetMemberCommand, signal?: AbortSignalLike): Promise<TeamMember> {
  return http.put<TeamMember>(`/api/topics/${segment(topicId)}/team/${segment(userId)}`, { body: command, signal })
}

export async function removeTeamMember(http: HttpClient, topicId: string, userId: string, signal?: AbortSignalLike): Promise<void> {
  return http.delete<void>(`/api/topics/${segment(topicId)}/team/${segment(userId)}`, { signal })
}

/** Signale une question (au moins un motif). */
export async function reportQuestion(http: HttpClient, questionId: string, command: QuestionReportRequest, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/questions/${segment(questionId)}/reports`, { body: command, signal })
}

/** Signale un joueur (au moins un motif). */
export async function reportUser(http: HttpClient, userId: string, command: UserReportRequest, signal?: AbortSignalLike): Promise<void> {
  return http.post<void>(`/api/profiles/${segment(userId)}/reports`, { body: command, signal })
}

/** Notification de contenu illicite (LCEN/DSA), avec ou sans compte. */
export async function submitContentNotice(http: HttpClient, command: import('../types.js').ContentNoticeRequest): Promise<void> {
  return http.post<void>('/api/public/content-notices', { body: command })
}
