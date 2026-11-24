import { typed } from '../../../core/query/keys.js'
import type { PageResponse } from '../../../core/types/common.js'
import type { TopicCardView } from '../../topics/types.js'
import type {
  OwnerQuestionReport,
  QuestionEditorView,
  ReportDetail,
  ReportedQuestion,
  TeamMember,
  TopicTodo,
  TopicWorkshop,
} from '../types.js'

/** Clés de l'atelier : listes de l'auteur, puis tout l'atelier d'un sujet sous `topic(id)`. */
export const authoringKeys = {
  root: ['authoring'] as const,
  todo: () => typed<TopicTodo[]>()(['authoring', 'todo']),
  /** Sujets où je contribue (créateur, admin ou rédacteur). */
  contributed: () => typed<PageResponse<TopicCardView>>()(['authoring', 'contributed']),
  /** Sujets dont je suis le créateur (plafond de sujets publiés). */
  created: () => typed<PageResponse<TopicCardView>>()(['authoring', 'created']),
  /** Sujets publiés au nom proche (avertissement de doublon de « Nouveau sujet »). */
  named: (query: string) => typed<PageResponse<TopicCardView>>()(['authoring', 'named', query]),
  /** Tout l'atelier d'un sujet (préfixe). */
  topic: (topicId: string | undefined) => ['authoring', 'topic', topicId] as const,
  workshop: (topicId: string | undefined) => typed<TopicWorkshop>()(['authoring', 'topic', topicId, 'workshop']),
  questions: (topicId: string | undefined) =>
    typed<QuestionEditorView[]>()(['authoring', 'topic', topicId, 'questions']),
  reports: (topicId: string | undefined) => typed<ReportedQuestion[]>()(['authoring', 'topic', topicId, 'reports']),
  team: (topicId: string | undefined) => typed<TeamMember[]>()(['authoring', 'topic', topicId, 'team']),
  reportDetail: (reportId: string | undefined) => typed<ReportDetail>()(['authoring', 'report', reportId]),
  questionReports: (questionId: string | undefined) =>
    typed<OwnerQuestionReport[]>()(['authoring', 'question-reports', questionId]),
  mutations: {
    topic: (action: string) => ['authoring', 'topic', action] as const,
    question: (action: string) => ['authoring', 'question', action] as const,
    team: () => ['authoring', 'team'] as const,
    report: (target: 'question' | 'user' | 'content') => ['authoring', 'report', target] as const,
  },
}
