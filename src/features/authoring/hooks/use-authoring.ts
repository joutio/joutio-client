import { useQuery } from '@tanstack/react-query'
import { useJoutio } from '../../../core/runtime/context.js'
import { sameNameTopic } from '../domain/topic-name.js'
import { authoringQueries, SAME_NAME_MIN_LENGTH } from '../query/queries.js'

/** File « À traiter » : questions en attente et signalements, par sujet géré. */
export function useWorkshopTodo() {
  const { http } = useJoutio()
  return useQuery(authoringQueries.todo(http))
}

/** Mes sujets : ceux où je contribue (créateur, admin, rédacteur), brouillons et publiés. */
export function useContributedTopics() {
  const { http } = useJoutio()
  return useQuery(authoringQueries.contributed(http))
}

/** Sujets dont je suis le créateur : seuls comptent dans le plafond de sujets publiés. */
export function useCreatedTopics() {
  const { http } = useJoutio()
  return useQuery(authoringQueries.created(http))
}

/** Tout l'atelier d'un sujet et mes droits dessus. */
export function useWorkshop(topicId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(authoringQueries.workshop(http, topicId))
}

/** Toutes les questions du sujet ; recherche et filtres se font dans l'app. */
export function useTopicQuestions(topicId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(authoringQueries.questions(http, topicId))
}

/** File des questions signalées d'un sujet. */
export function useReportQueue(topicId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(authoringQueries.reports(http, topicId))
}

/** Équipe d'un sujet. */
export function useTeam(topicId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(authoringQueries.team(http, topicId))
}

/** Détail d'un signalement. */
export function useReportDetail(reportId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(authoringQueries.reportDetail(http, reportId))
}

/** Signalements ouverts d'une question. */
export function useQuestionReports(questionId: string | undefined) {
  const { http } = useJoutio()
  return useQuery(authoringQueries.questionReports(http, questionId))
}

/**
 * Sujet publié qui porte déjà ce nom : avertissement non bloquant de « Nouveau sujet ». `name` arrive temporisé par
 * l'app ; en dessous de 3 caractères, aucune requête.
 */
export function useSameNameTopic(name: string) {
  const { http } = useJoutio()
  const term = name.trim()
  return useQuery({
    ...authoringQueries.named(http, term),
    select: (page) => (term.length >= SAME_NAME_MIN_LENGTH ? sameNameTopic(term, page.content) : undefined),
  })
}
