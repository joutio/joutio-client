import type { AbortSignalLike, HttpClient } from '../../../http.js'
import { segment } from '../../../http.js'
import type { PageResponse } from '../../../types/common.js'
import type { TopicCardView } from '../../topics/types.js'
import type { OwnerQuestionReport, QuestionEditorView, ReportedQuestion, ReportDetail, TeamMember, TopicTodo, TopicWorkshop } from '../types.js'

/** Taille de page de `GET /api/topics/{id}/questions` (plafond BFF : 100). */
export const QUESTIONS_PAGE = 100

/** Lectures de l'atelier. */

/** File « À traiter » : questions en attente et signalements. */
export async function getWorkshopTodo(http: HttpClient, signal?: AbortSignalLike): Promise<TopicTodo[]> {
  return http.get<TopicTodo[]>('/api/topics/contributed/todo', { signal })
}

/** Tout l'atelier d'un sujet. */
export async function getWorkshop(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<TopicWorkshop> {
  return http.get<TopicWorkshop>(`/api/topics/${segment(topicId)}/workshop`, { signal })
}

/** Équipe d'un sujet. */
export async function getTeam(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<TeamMember[]> {
  return http.get<TeamMember[]>(`/api/topics/${segment(topicId)}/team`, { signal })
}

/** File des questions signalées d'un sujet (Modération › Signalements). */
export async function getReportQueue(http: HttpClient, topicId: string, signal?: AbortSignalLike): Promise<ReportedQuestion[]> {
  return http.get<ReportedQuestion[]>(`/api/question-reports/topics/${segment(topicId)}`, { signal })
}

/** Mes sujets (page unique de 100, plafond BFF). */
export async function getMyTopics(http: HttpClient, signal?: AbortSignalLike): Promise<PageResponse<TopicCardView>> {
  return http.get<PageResponse<TopicCardView>>('/api/topics/contributed', { query: { page: 0, size: 100 }, signal })
}

/** Mes sujets créés. */
export async function getCreatedTopics(http: HttpClient, signal?: AbortSignalLike): Promise<PageResponse<TopicCardView>> {
  return http.get<PageResponse<TopicCardView>>('/api/topics', { query: { mine: true, page: 0, size: 100 }, signal })
}

/** Sujets publiés au nom proche (avertissement de doublon de « Nouveau sujet »). */
export async function getTopicsNamed(http: HttpClient, query: string, signal?: AbortSignalLike): Promise<PageResponse<TopicCardView>> {
  return http.get<PageResponse<TopicCardView>>('/api/topics', { query: { q: query, page: 0, size: 20 }, signal })
}

/** Toutes les questions du sujet (150 au plus) : recherche et filtres se font dans l'app. */
export async function getAllQuestions(http: HttpClient, topicId: string): Promise<QuestionEditorView[]> {
  const all: QuestionEditorView[] = []
  for (let page = 0; ; page += 1) {
    const result = await http.get<PageResponse<QuestionEditorView>>(`/api/topics/${segment(topicId)}/questions`, {
      query: { page, size: QUESTIONS_PAGE },
    })
    all.push(...result.content)
    if (result.last || result.content.length === 0) return all
  }
}

/** Détail d'un signalement. */
export async function getReportDetail(http: HttpClient, reportId: string, signal?: AbortSignalLike): Promise<ReportDetail> {
  return http.get<ReportDetail>(`/api/question-reports/${segment(reportId)}`, { signal })
}

/** Signalements ouverts d'une question. */
export async function getQuestionReports(http: HttpClient, questionId: string, signal?: AbortSignalLike): Promise<OwnerQuestionReport[]> {
  return http.get<OwnerQuestionReport[]>(`/api/questions/${segment(questionId)}/reports`, { signal })
}
