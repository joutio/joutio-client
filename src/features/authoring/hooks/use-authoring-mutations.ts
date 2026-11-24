import { useMutation, type QueryClient } from '@tanstack/react-query'
import { isOptimisticId, optimisticId } from '../../../core/ids.js'
import {
  cancel,
  change,
  changeFields,
  nothingToUndo,
  removeFrom,
  undoAll,
  type Undo,
} from '../../../core/query/optimistic.js'
import { useCommand, useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import { useJoutio } from '../../../core/runtime/context.js'
import type { Language, PageResponse } from '../../../core/types/common.js'
import { changeTopicCard, changeTopicFields } from '../../topics/cache/topic-card.js'
import { topicKeys } from '../../topics/query/keys.js'
import type { TopicCardView, TopicOverviewView } from '../../topics/types.js'
import {
  applyOperations,
  changeQuestion,
  dropFromQueue,
  removeQuestion,
  shiftTodo,
  syncApproved,
} from '../cache/workshop.js'
import { descriptionsDraft } from '../domain/description.js'
import type { QuestionOperation } from '../domain/question-draft.js'
import type { TopicTitles } from '../domain/titles.js'
import { authoringKeys } from '../query/keys.js'
import type { ContentNoticeRequest, QuestionReportRequest, TeamMember, TeamRole, UserReportRequest } from '../types.js'
import {
  approveQuestion,
  archiveQuestion,
  createTopic,
  deleteQuestion,
  deleteTopic,
  draftTopic,
  publishTopic,
  rejectQuestion,
  removeTeamMember,
  reportQuestion,
  reportUser,
  resolveQuestionReports,
  restoreQuestion,
  saveQuestion,
  setTeamMember,
  submitContentNotice,
  updateTopicCategory,
  updateTopicDescription,
  updateTopicImageUrl,
  updateTopicName,
  updateTopicPictogramUrl,
  updateTopicTitles,
} from '../services/authoring-command.service.js'

/** Toutes les vues d'un sujet de l'atelier : cartes (fiche, catalogue, Accueil, Mes sujets) et atelier. */
const topicViews = (topicId: string) => [authoringKeys.root, topicKeys.detail(topicId), topicKeys.lists()]

/* ───────────── Sujet ───────────── */

/** Crée un brouillon : il apparaît tout de suite en tête de Mes sujets ; la réponse remplace son identifiant provisoire. */
export function useCreateTopic() {
  const { http, clock } = useJoutio()
  return useMutation({
    mutationKey: authoringKeys.mutations.topic('create'),
    mutationFn: ({ name, category }: { name: string; category: string }) =>
      createTopic(http, { names: { fr: name }, category }),
    onMutate: async ({ name, category }, { client }) => {
      await cancel(client, [authoringKeys.contributed(), authoringKeys.created()])
      const draftId = optimisticId(clock())
      const draft: TopicCardView = {
        topicId: draftId,
        names: { fr: name },
        description: null,
        category,
        categoryLabel: null,
        imageUrl: null,
        bannerUrl: null,
        pictogramUrl: null,
        followersCount: 0,
        questionsCount: 0,
        followed: false,
        status: 'DRAFT',
      }
      const insert = (page: PageResponse<TopicCardView>) => ({
        ...page,
        content: [draft, ...page.content],
        totalElements: page.totalElements + 1,
      })
      const drop = (page: PageResponse<TopicCardView>) => ({
        ...page,
        content: page.content.filter((topic) => topic.topicId !== draftId),
        totalElements: Math.max(0, page.totalElements - 1),
      })
      return {
        draftId,
        undo: undoAll([
          change(client, { queryKey: authoringKeys.contributed(), exact: true }, insert, drop),
          change(client, { queryKey: authoringKeys.created(), exact: true }, insert, drop),
        ]),
      }
    },
    onSuccess: ({ id }, _variables, { draftId }, { client }) => {
      changeTopicFields(client, draftId, { topicId: id })
      client.setQueryData(authoringKeys.questions(id), [])
    },
    onError: (_error, _variables, context) => context?.undo(),
  })
}

/** Noms du sujet (français obligatoire, anglais facultatif) : une commande par langue ; un échec garde les noms acceptés. */
export function useUpdateTopicNames(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic('names'),
    mutationFn: async (names: Partial<Record<Language, string>>, { http }) => {
      const done: Partial<Record<Language, string>> = {}
      try {
        for (const [language, name] of Object.entries(names) as [Language, string][]) {
          await updateTopicName(http, topicId, { language, name })
          done[language] = name
        }
      } catch (cause) {
        throw Object.assign(new Error('partial topic names', { cause }), { done })
      }
    },
    touches: () => topicViews(topicId),
    apply: (client, names) => renameTopic(client, topicId, names),
    recover: (client, error) => {
      if ('done' in error) renameTopic(client, topicId, error.done as Partial<Record<Language, string>>)
    },
  })
}

function renameTopic(client: QueryClient, topicId: string, names: Partial<Record<Language, string>>): Undo {
  const languages = Object.keys(names) as Language[]
  const previous = new Map<string, TopicCardView['names']>()
  return changeTopicCard(
    client,
    topicId,
    (topic) => {
      previous.set(topic.topicId, topic.names)
      return { ...topic, names: { ...topic.names, ...names } }
    },
    (topic) => {
      const before = previous.get(topic.topicId)
      if (!before) return topic
      const restored = { ...topic.names }
      for (const language of languages)
        if (restored[language] === names[language]) restored[language] = before[language] as string
      return { ...topic, names: restored }
    },
  )
}

/** Un champ de la carte du sujet (univers, vignette, pictogramme), optimiste partout. */
function useTopicField<V>(
  topicId: string,
  action: string,
  send: (http: Parameters<typeof updateTopicCategory>[0], value: V) => Promise<void>,
  fields: (value: V) => Partial<TopicCardView>,
) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic(action),
    mutationFn: (value: V, { http }) => send(http, value),
    touches: () => topicViews(topicId),
    apply: (client, value) => changeTopicFields(client, topicId, fields(value)),
  })
}

export const useUpdateTopicCategory = (topicId: string) =>
  useTopicField(
    topicId,
    'category',
    (http, category: string) => updateTopicCategory(http, topicId, { category }),
    (category) => ({ category }),
  )

export const useUpdateTopicImage = (topicId: string) =>
  useTopicField(
    topicId,
    'image',
    (http, imageUrl: string | null) => updateTopicImageUrl(http, topicId, { imageUrl }),
    (imageUrl) => ({ imageUrl }),
  )

export const useUpdateTopicPictogram = (topicId: string) =>
  useTopicField(
    topicId,
    'pictogram',
    (http, pictogramUrl: string | null) => updateTopicPictogramUrl(http, topicId, { pictogramUrl }),
    (pictogramUrl) => ({ pictogramUrl }),
  )

/** Description dans une langue (vide : retirée) ; le champ `description` historique suit la française. */
export function useUpdateTopicDescription(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic('description'),
    mutationFn: ({ description, language }: { description: string | null; language: Language }, { http }) =>
      updateTopicDescription(http, topicId, { description: description ?? '', language }),
    touches: () => topicViews(topicId),
    apply: (client, { description, language }) => {
      const previous = new Map<string, Pick<TopicCardView, 'descriptions' | 'description'>>()
      return changeTopicCard(
        client,
        topicId,
        (topic) => {
          previous.set(topic.topicId, { descriptions: topic.descriptions, description: topic.description })
          const kept = Object.fromEntries(
            Object.entries({ ...descriptionsDraft(topic), [language]: description ?? '' }).filter(
              ([, value]) => value !== '',
            ),
          )
          return { ...topic, descriptions: kept, description: kept.fr ?? null }
        },
        (topic) => ({ ...topic, ...previous.get(topic.topicId) }),
      )
    },
  })
}

/** Titres par palier : l'atelier et la fiche sujet (onglet Progression) changent tout de suite ; `null` efface tout. */
export function useUpdateTopicTitles(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic('titles'),
    mutationFn: (titles: TopicTitles | null, { http }) => updateTopicTitles(http, topicId, { titles }),
    touches: () => [authoringKeys.workshop(topicId), topicKeys.overview(topicId)],
    apply: (client, titles) =>
      undoAll([
        changeFields(client, authoringKeys.workshop(topicId), { titles }),
        changeFields<TopicOverviewView>(client, topicKeys.overview(topicId), { titles }),
      ]),
  })
}

export function usePublishTopic(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic('publish'),
    mutationFn: (_: void, { http }) => publishTopic(http, topicId),
    touches: () => topicViews(topicId),
    apply: (client) => changeTopicFields(client, topicId, { status: 'PUBLISHED' }),
  })
}

export function useDraftTopic(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic('draft'),
    mutationFn: (_: void, { http }) => draftTopic(http, topicId),
    touches: () => topicViews(topicId),
    apply: (client) => changeTopicFields(client, topicId, { status: 'DRAFT' }),
  })
}

/** Supprime un brouillon : il quitte Mes sujets et « À traiter » sur place. */
export function useDeleteTopic(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.topic('delete'),
    mutationFn: (_: void, { http }) => deleteTopic(http, topicId),
    touches: () => [authoringKeys.root],
    apply: (client) => {
      const isTopic = (topic: { topicId: string }) => topic.topicId === topicId
      const removeFromPage = (
        key: ReturnType<typeof authoringKeys.contributed | typeof authoringKeys.created>,
      ): Undo => {
        const page = client.getQueryData(key)
        if (!page) return nothingToUndo
        const removal = removeFrom(page.content, isTopic)
        client.setQueryData(key, {
          ...page,
          content: removal.items,
          totalElements: Math.max(0, page.totalElements - (page.content.length - removal.items.length)),
        })
        return () =>
          client.setQueryData(key, (current) =>
            current
              ? {
                  ...current,
                  content: removal.restore(current.content),
                  totalElements: current.totalElements + (page.content.length - removal.items.length),
                }
              : current,
          )
      }
      const todo = client.getQueryData(authoringKeys.todo())
      const todoRemoval = todo ? removeFrom(todo, isTopic) : undefined
      if (todoRemoval) client.setQueryData(authoringKeys.todo(), todoRemoval.items)
      return undoAll([
        removeFromPage(authoringKeys.contributed()),
        removeFromPage(authoringKeys.created()),
        todoRemoval
          ? () =>
              client.setQueryData(authoringKeys.todo(), (current) => (current ? todoRemoval.restore(current) : current))
          : nothingToUndo,
      ])
    },
  })
}

/* ───────────── Questions ───────────── */

export interface QuestionSave {
  /** Question modifiée ; absente pour une création. */
  questionId?: string
  operations: readonly QuestionOperation[]
  /** Clôt les signalements ouverts de la question après correction (`RESOLVED`). */
  resolveReports?: boolean
}

export interface QuestionSaved {
  id: string
  /** Faux si la question est enregistrée mais ses signalements sont restés ouverts. */
  reportsResolved: boolean
}

/**
 * Enregistre une question (création ou modification) : la liste et la file affichent déjà la question à jour. Un échec
 * partiel garde les opérations que le serveur a acceptées ; des signalements restés ouverts reviennent dans la file.
 */
export function useSaveQuestion(topicId: string) {
  const { http, clock } = useJoutio()
  return useMutation({
    mutationKey: authoringKeys.mutations.question('save'),
    mutationFn: async ({ questionId, operations, resolveReports }: QuestionSave): Promise<QuestionSaved> => {
      const id = await saveQuestion(http, topicId, questionId, operations)
      if (!resolveReports) return { id, reportsResolved: true }
      try {
        await resolveQuestionReports(http, id, { resolution: 'RESOLVED' })
        return { id, reportsResolved: true }
      } catch {
        return { id, reportsResolved: false }
      }
    },
    onMutate: async ({ questionId, operations, resolveReports }, { client }) => {
      await cancel(client, [authoringKeys.root, topicKeys.detail(topicId), topicKeys.lists()])
      const localId = questionId ?? optimisticId(clock())
      const now = new Date(clock()).toISOString()
      const undo = undoAll([
        applyOperations(client, topicId, localId, operations, now),
        questionId && operations.length > 0 ? reopenIfRejected(client, topicId, questionId) : nothingToUndo,
        syncApproved(client, topicId),
      ])
      const reports = resolveReports ? dropFromQueue(client, topicId, localId) : nothingToUndo
      return { undo, reports, localId }
    },
    onSuccess: ({ id, reportsResolved }, _variables, context, { client }) => {
      if (!reportsResolved) context.reports()
      if (isOptimisticId(context.localId)) changeQuestion(client, topicId, context.localId, { questionId: id })
    },
    onError: (error, _variables, context, { client }) => {
      context?.reports()
      context?.undo()
      if (
        'completedOperations' in error &&
        Array.isArray(error.completedOperations) &&
        'questionId' in error &&
        typeof error.questionId === 'string'
      ) {
        applyOperations(
          client,
          topicId,
          error.questionId,
          error.completedOperations as QuestionOperation[],
          new Date(clock()).toISOString(),
        )
        syncApproved(client, topicId)
      }
    },
  })
}

/** Une question rejetée qu'on modifie repasse en attente de modération. */
function reopenIfRejected(client: QueryClient, topicId: string, questionId: string): Undo {
  const question = client.getQueryData(authoringKeys.questions(topicId))?.find((item) => item.questionId === questionId)
  return question?.status === 'REJECTED'
    ? changeQuestion(client, topicId, questionId, { status: 'PENDING', rejectionReason: null })
    : nothingToUndo
}

/** Approuve ou rejette une question en attente : « À traiter » et le compteur d'approuvées suivent. */
export function useModerateQuestion(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.question('moderate'),
    mutationFn: (
      { questionId, decision, reason }: { questionId: string; decision: 'approve' | 'reject'; reason?: string },
      { http },
    ) =>
      decision === 'approve'
        ? approveQuestion(http, questionId)
        : rejectQuestion(http, questionId, { reason: reason ?? '' }),
    touches: () => topicViews(topicId),
    apply: (client, { questionId, decision }) => {
      const before = client
        .getQueryData(authoringKeys.questions(topicId))
        ?.find((question) => question.questionId === questionId)
      return undoAll([
        before?.status === 'PENDING' ? shiftTodo(client, topicId, { pending: -1 }) : nothingToUndo,
        changeQuestion(client, topicId, questionId, {
          status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
          suspended: false,
          archived: false,
        }),
        syncApproved(client, topicId),
      ])
    },
  })
}

/** Archive une question, ou la restaure (retour en attente) ; sous 7 approuvées, un sujet publié repasse en brouillon. */
export function useArchiveQuestion(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.question('archive'),
    mutationFn: ({ questionId, restore }: { questionId: string; restore?: boolean }, { http }) =>
      restore ? restoreQuestion(http, questionId) : archiveQuestion(http, questionId),
    touches: () => topicViews(topicId),
    apply: (client, { questionId, restore }) =>
      undoAll([
        changeQuestion(client, topicId, questionId, {
          status: restore ? 'PENDING' : 'ARCHIVED',
          archived: !restore,
          suspended: false,
        }),
        syncApproved(client, topicId, !restore),
      ]),
  })
}

export function useDeleteQuestion(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.question('delete'),
    mutationFn: (questionId: string, { http }) => deleteQuestion(http, questionId),
    touches: () => topicViews(topicId),
    apply: (client, questionId) =>
      undoAll([removeQuestion(client, topicId, questionId), syncApproved(client, topicId, true)]),
  })
}

/** « Clore sans modifier » : les signalements ouverts de la question sont écartés (`DISMISSED`). */
export function useDismissReports(topicId: string) {
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.question('dismiss-reports'),
    mutationFn: (questionId: string, { http }) => resolveQuestionReports(http, questionId, { resolution: 'DISMISSED' }),
    touches: () => [authoringKeys.root],
    apply: (client, questionId) => dropFromQueue(client, topicId, questionId),
  })
}

/* ───────────── Équipe ───────────── */

export type TeamChange = { member: TeamMember; remove?: false } | { member: Pick<TeamMember, 'userId'>; remove: true }

/** Ajoute un membre, change son rôle ou le retire ; la réponse du serveur remplace le membre ajouté. */
export function useTeamChange(topicId: string) {
  const key = authoringKeys.team(topicId)
  return useOptimisticMutation({
    mutationKey: authoringKeys.mutations.team(),
    mutationFn: async (change: TeamChange, { http }): Promise<TeamMember | undefined> => {
      if (!change.remove)
        return setTeamMember(http, topicId, change.member.userId, { role: change.member.role as TeamRole })
      await removeTeamMember(http, topicId, change.member.userId)
      return undefined
    },
    touches: () => [key],
    apply: (client, teamChange) => {
      const isMember = (item: TeamMember) => item.userId === teamChange.member.userId
      const team = client.getQueryData(key)
      if (!team) return nothingToUndo
      const before = team.find(isMember)
      const next = teamChange.remove
        ? team.filter((item) => !isMember(item))
        : [...team.filter((item) => !isMember(item)), teamChange.member]
      client.setQueryData(key, next)
      return () =>
        client.setQueryData(key, (current) => {
          if (!current) return current
          const others = current.filter((item) => !isMember(item))
          return before ? [...others, before] : others
        })
    },
    settle: (client, member) => {
      if (member)
        client.setQueryData(key, (team) => team?.map((item) => (item.userId === member.userId ? member : item)))
    },
  })
}

/* ───────────── Signalements ───────────── */

/** Signale une question (au moins un motif) : aucune vue ne change, la modération le traite. */
export function useReportQuestion() {
  return useCommand(
    authoringKeys.mutations.report('question'),
    ({ questionId, report }: { questionId: string; report: QuestionReportRequest }, { http }) =>
      reportQuestion(http, questionId, report),
  )
}

/** Signale un joueur (au moins un motif). */
export function useReportUser() {
  return useCommand(
    authoringKeys.mutations.report('user'),
    ({ userId, report }: { userId: string; report: UserReportRequest }, { http }) => reportUser(http, userId, report),
  )
}

/** Notification de contenu illicite (LCEN/DSA), avec ou sans compte. */
export function useSubmitContentNotice() {
  return useCommand(authoringKeys.mutations.report('content'), (notice: ContentNoticeRequest, { http }) =>
    submitContentNotice(http, notice),
  )
}
