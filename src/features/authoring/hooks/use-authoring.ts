import { skipToken, useQuery } from '@tanstack/react-query'
import type { HttpClient } from '../../../http.js'
import { getReportQueue, getTeam, getWorkshop, getWorkshopTodo } from '../services/authoring-query.service.js'

/** Clés React Query de l'atelier, exportées pour les écritures transversales (`queryKeys`). */
export const authoringKeys = {
  /** Tout l'atelier (préfixe). */
  all: () => ['authoring'] as const,
  topics: () => ['authoring', 'topics'] as const,
  created: () => ['authoring', 'created'] as const,
  todo: () => ['authoring', 'todo'] as const,
  /** Sujets publiés au nom proche, pour l'avertissement de doublon de « Nouveau sujet ». */
  named: (query: string) => ['authoring', 'named', query] as const,
  /** Tout l'atelier d'un sujet (préfixe). */
  topic: (topicId: string) => ['authoring', topicId] as const,
  workshop: (topicId: string) => ['authoring', topicId, 'workshop'] as const,
  questions: (topicId: string) => ['authoring', topicId, 'questions'] as const,
  reports: (topicId: string) => ['authoring', topicId, 'reports'] as const,
  team: (topicId: string) => ['authoring', topicId, 'team'] as const,
  /** Détails de signalement d'un sujet (préfixe). */
  reportDetails: (topicId: string) => ['authoring', topicId, 'report-detail'] as const,
}

/** File « À traiter » : questions en attente et signalements. */
export function useWorkshopTodo(http: HttpClient) {
  return useQuery({ queryKey: authoringKeys.todo(), queryFn: ({ signal }) => getWorkshopTodo(http, signal) })
}

/** Tout l'atelier d'un sujet. */
export function useWorkshop(http: HttpClient, topicId: string | undefined) {
  return useQuery({
    queryKey: authoringKeys.workshop(topicId ?? ''),
    queryFn: topicId ? ({ signal }) => getWorkshop(http, topicId, signal) : skipToken,
  })
}

/** Équipe d'un sujet. */
export function useTeam(http: HttpClient, topicId: string | undefined) {
  return useQuery({
    queryKey: authoringKeys.team(topicId ?? ''),
    queryFn: topicId ? ({ signal }) => getTeam(http, topicId, signal) : skipToken,
  })
}

/** File des questions signalées d'un sujet. */
export function useReportQueue(http: HttpClient, topicId: string | undefined) {
  return useQuery({
    queryKey: authoringKeys.reports(topicId ?? ''),
    queryFn: topicId ? ({ signal }) => getReportQueue(http, topicId, signal) : skipToken,
  })
}
