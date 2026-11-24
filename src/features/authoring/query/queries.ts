import { queryOptions, skipToken } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import {
  getAllQuestions,
  getCreatedTopics,
  getMyTopics,
  getQuestionReports,
  getReportDetail,
  getReportQueue,
  getTeam,
  getTopicsNamed,
  getWorkshop,
  getWorkshopTodo,
} from '../services/authoring-query.service.js'
import { authoringKeys } from './keys.js'

/** Nom saisi à partir duquel l'atelier cherche les sujets homonymes. */
export const SAME_NAME_MIN_LENGTH = 3

export const authoringQueries = {
  todo: (http: HttpClient) =>
    queryOptions({ queryKey: authoringKeys.todo(), queryFn: ({ signal }) => getWorkshopTodo(http, signal) }),
  contributed: (http: HttpClient) =>
    queryOptions({ queryKey: authoringKeys.contributed(), queryFn: ({ signal }) => getMyTopics(http, signal) }),
  created: (http: HttpClient) =>
    queryOptions({ queryKey: authoringKeys.created(), queryFn: ({ signal }) => getCreatedTopics(http, signal) }),
  named: (http: HttpClient, name: string) =>
    queryOptions({
      queryKey: authoringKeys.named(name),
      queryFn: name.length >= SAME_NAME_MIN_LENGTH ? ({ signal }) => getTopicsNamed(http, name, signal) : skipToken,
    }),
  workshop: (http: HttpClient, topicId: string | undefined) =>
    queryOptions({
      queryKey: authoringKeys.workshop(topicId),
      queryFn: topicId ? ({ signal }) => getWorkshop(http, topicId, signal) : skipToken,
    }),
  questions: (http: HttpClient, topicId: string | undefined) =>
    queryOptions({
      queryKey: authoringKeys.questions(topicId),
      queryFn: topicId ? () => getAllQuestions(http, topicId) : skipToken,
    }),
  reports: (http: HttpClient, topicId: string | undefined) =>
    queryOptions({
      queryKey: authoringKeys.reports(topicId),
      queryFn: topicId ? ({ signal }) => getReportQueue(http, topicId, signal) : skipToken,
    }),
  team: (http: HttpClient, topicId: string | undefined) =>
    queryOptions({
      queryKey: authoringKeys.team(topicId),
      queryFn: topicId ? ({ signal }) => getTeam(http, topicId, signal) : skipToken,
    }),
  reportDetail: (http: HttpClient, reportId: string | undefined) =>
    queryOptions({
      queryKey: authoringKeys.reportDetail(reportId),
      queryFn: reportId ? ({ signal }) => getReportDetail(http, reportId, signal) : skipToken,
    }),
  questionReports: (http: HttpClient, questionId: string | undefined) =>
    queryOptions({
      queryKey: authoringKeys.questionReports(questionId),
      queryFn: questionId ? ({ signal }) => getQuestionReports(http, questionId, signal) : skipToken,
    }),
}
