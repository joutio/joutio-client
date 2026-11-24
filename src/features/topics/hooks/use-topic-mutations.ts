import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { change, nothingToUndo, removeFrom, undoAll, type Undo } from '../../../core/query/optimistic.js'
import { useOptimisticMutation } from '../../../core/query/use-optimistic-mutation.js'
import { homeKeys } from '../../home/query/keys.js'
import { authoringKeys } from '../../authoring/query/keys.js'
import { changeTopicCard, findTopicCard } from '../cache/topic-card.js'
import { topicKeys } from '../query/keys.js'
import type { TopicCardView, TopicPage } from '../types.js'
import { followTopic, unfollowTopic } from '../services/topics-command.service.js'

const isTopic = (topicId: string) => (topic: TopicCardView) => topic.topicId === topicId

/** Bascule le drapeau `followed` et le compteur d'abonnés ; l'inverse ne rebascule que si personne ne l'a fait depuis. */
function flipFollow(client: QueryClient, topicId: string, follow: boolean): Undo {
  const delta = follow ? 1 : -1
  return changeTopicCard(
    client,
    topicId,
    (topic) =>
      topic.followed === follow
        ? topic
        : { ...topic, followed: follow, followersCount: Math.max(0, topic.followersCount + delta) },
    (topic) =>
      topic.followed !== follow
        ? topic
        : { ...topic, followed: !follow, followersCount: Math.max(0, topic.followersCount - delta) },
  )
}

/** Le sujet quitte les listes du catalogue dont il ne respecte plus les filtres (« Suivis », « Masquer les suivis »). */
function leaveFilteredLists(client: QueryClient, topicId: string, follow: boolean): Undo {
  const undos = client
    .getQueriesData<InfiniteData<TopicPage, number>>({ queryKey: topicKeys.lists() })
    .map(([key, data]) => {
      const filters = topicKeys.listFilters(key)
      const excluded = follow ? filters.hideFollowed : filters.followed
      if (!data || !excluded) return nothingToUndo
      const removals = data.pages.map((page) => removeFrom(page.topics, isTopic(topicId)))
      client.setQueryData(key, {
        ...data,
        pages: data.pages.map((page, index) => ({ ...page, topics: removals[index]?.items ?? page.topics })),
      })
      return () =>
        client.setQueryData<InfiniteData<TopicPage, number>>(key, (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page, index) => ({
                  ...page,
                  topics: removals[index]?.restore(page.topics) ?? page.topics,
                })),
              }
            : current,
        )
    })
  return undoAll(undos)
}

/** Le rail « Suivis » de l'Accueil gagne ou perd le sujet. */
function updateFollowedRail(
  client: QueryClient,
  topicId: string,
  follow: boolean,
  card: TopicCardView | undefined,
): Undo {
  if (follow) {
    if (!card) return nothingToUndo
    return change(
      client,
      { queryKey: homeKeys.view(), exact: true },
      (home) =>
        home.followedTopics.some(isTopic(topicId))
          ? home
          : { ...home, followedTopics: [...home.followedTopics, { ...card, followed: true }] },
      (home) => ({ ...home, followedTopics: home.followedTopics.filter((topic) => !isTopic(topicId)(topic)) }),
    )
  }
  const home = client.getQueryData(homeKeys.view())
  if (!home) return nothingToUndo
  const removal = removeFrom(home.followedTopics, isTopic(topicId))
  client.setQueryData(homeKeys.view(), { ...home, followedTopics: removal.items })
  return () =>
    client.setQueryData(homeKeys.view(), (current) =>
      current ? { ...current, followedTopics: removal.restore(current.followedTopics) } : current,
    )
}

/**
 * Suivre ou ne plus suivre un sujet : fiche, catalogue, Accueil et Mes sujets changent tout de suite ; la carte suit
 * les filtres du catalogue et le rail « Suivis ». `mutate(true)` suit, `mutate(false)` ne suit plus.
 */
export function useFollowTopic(topicId: string) {
  return useOptimisticMutation({
    mutationKey: topicKeys.mutations.follow(topicId),
    mutationFn: (follow: boolean, { http }) => (follow ? followTopic : unfollowTopic)(http, topicId),
    touches: () => [topicKeys.detail(topicId), topicKeys.lists(), homeKeys.view(), authoringKeys.contributed()],
    apply: (client, follow) => {
      const card = findTopicCard(client, topicId)
      return undoAll([
        flipFollow(client, topicId, follow),
        leaveFilteredLists(client, topicId, follow),
        updateFollowedRail(client, topicId, follow, card),
      ])
    },
  })
}
