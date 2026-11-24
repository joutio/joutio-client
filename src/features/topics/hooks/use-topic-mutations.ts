import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { HttpClient } from '../../../core/http.js'
import { queryKeys } from '../../../core/query/keys.js'
import type { HomeView } from '../../home/types.js'
import type { MeView } from '../../me/types.js'
import type { TitlesView } from '../../profile/types.js'
import { updateProfileTitle } from '../../profile/services/profile-command.service.js'
import { followTopic, unfollowTopic } from '../services/topics-command.service.js'
import type { TopicCardView, TopicOverviewView } from '../types.js'

/** Callbacks d'affichage fournis par l'app (toast, navigation…). */
export interface TopicMutationCallbacks<T> {
  onSuccess?: (value: T) => void
  onError?: (value: T) => void
}

type TopicListPage = { topics: TopicCardView[] }

const invalidate = (client: ReturnType<typeof useQueryClient>, keys: readonly unknown[]) =>
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey: queryKey as never }))

/**
 * Suivre / ne plus suivre un sujet : optimiste sur la fiche, le catalogue et l'accueil, relu en
 * cas de refus. Le drapeau `followed` est basculé partout, la carte suit les filtres du catalogue.
 */
export function useFollowTopic(http: HttpClient, topicId: string, callbacks?: TopicMutationCallbacks<boolean>) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['topics', 'follow', topicId],
    mutationFn: (follow: boolean) => (follow ? followTopic : unfollowTopic)(http, topicId),
    onMutate: (follow) => {
      const key = queryKeys.topic.overview(topicId)
      const previous = client.getQueryData<TopicOverviewView>(key)
      const flip = (topic: TopicCardView): TopicCardView =>
        topic.topicId === topicId
          ? { ...topic, followed: follow, followersCount: Math.max(0, topic.followersCount + (topic.followed === follow ? 0 : follow ? 1 : -1)) }
          : topic
      if (previous) client.setQueryData<TopicOverviewView>(key, { ...previous, topic: flip(previous.topic) })
      for (const [listKey, data] of client.getQueriesData<InfiniteData<TopicListPage>>({ queryKey: queryKeys.topics.lists() })) {
        if (!data) continue
        const filters = listKey[2] as { followed?: boolean; hideFollowed?: boolean }
        client.setQueryData(listKey, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            topics: page.topics.map(flip).filter((topic) => !((filters.followed && !topic.followed) || (filters.hideFollowed && topic.followed))),
          })),
        })
      }
      const card = previous?.topic
      client.setQueryData<HomeView>(queryKeys.home(), (data) =>
        data
          ? {
              ...data,
              followedTopics: follow
                ? data.followedTopics.some((topic) => topic.topicId === topicId)
                  ? data.followedTopics.map(flip)
                  : card
                    ? [...data.followedTopics, flip(card)]
                    : data.followedTopics
                : data.followedTopics.filter((topic) => topic.topicId !== topicId),
              trendingTopics: data.trendingTopics.map(flip),
              newTopics: data.newTopics.map(flip),
              recommendedTopics: data.recommendedTopics.map(flip),
            }
          : data,
      )
    },
    onSuccess: (_data, follow) => callbacks?.onSuccess?.(follow),
    onError: (_error, follow) => {
      invalidate(client, [queryKeys.topic.overview(topicId), queryKeys.topics.lists(), queryKeys.home()])
      callbacks?.onError?.(follow)
    },
  })
}

/** Porter un titre du sujet, ou retirer le titre porté : optimiste, relu en cas de refus. */
export function useWearTitle(http: HttpClient, userId: string, callbacks?: TopicMutationCallbacks<string | null>) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['topics', 'wear-title', userId],
    mutationFn: (titleKey: string | null) => updateProfileTitle(http, userId, titleKey),
    onMutate: (titleKey) => {
      const key = queryKeys.profiles.titles(userId)
      client.setQueryData<TitlesView>(key, (titles) => (titles ? { ...titles, equippedKey: titleKey } : titles))
      client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, equippedTitle: titleKey } : me))
    },
    onSuccess: (_data, titleKey) => callbacks?.onSuccess?.(titleKey),
    onError: (_error, titleKey) => {
      invalidate(client, [queryKeys.profiles.titles(userId), queryKeys.me()])
      callbacks?.onError?.(titleKey)
    },
  })
}
