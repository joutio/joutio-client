import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { change, undoAll, type Undo } from '../../../core/query/optimistic.js'
import type { PageResponse } from '../../../core/types/common.js'
import { authoringKeys } from '../../authoring/query/keys.js'
import type { TopicWorkshop } from '../../authoring/types.js'
import { homeKeys } from '../../home/query/keys.js'
import type { HomeView } from '../../home/types.js'
import { topicKeys } from '../query/keys.js'
import type { TopicCardView, TopicOverviewView, TopicPage } from '../types.js'

type CardMap = (topic: TopicCardView) => TopicCardView

const onCard = (topicId: string, fn: CardMap) => (topic: TopicCardView) =>
  topic.topicId === topicId ? fn(topic) : topic

const inHome =
  (fn: CardMap) =>
  (home: HomeView): HomeView => ({
    ...home,
    followedTopics: home.followedTopics.map(fn),
    trendingTopics: home.trendingTopics.map(fn),
    newTopics: home.newTopics.map(fn),
    recommendedTopics: home.recommendedTopics.map(fn),
  })

const inCatalogue = (fn: CardMap) => (data: InfiniteData<TopicPage, number>) => ({
  ...data,
  pages: data.pages.map((page) => ({ ...page, topics: page.topics.map(fn) })),
})

const inPage = (fn: CardMap) => (page: PageResponse<TopicCardView>) => ({ ...page, content: page.content.map(fn) })

/**
 * Applique `apply` à la carte d'un sujet partout où elle est affichée : fiche, catalogue, Accueil, Mes sujets et atelier.
 * L'inverse applique `revert` aux mêmes vues ; les deux doivent être ciblés (un champ, un compteur).
 */
export function changeTopicCard(client: QueryClient, topicId: string, apply: CardMap, revert: CardMap): Undo {
  const both = <T>(map: (fn: CardMap) => (data: T) => T) =>
    [map(onCard(topicId, apply)), map(onCard(topicId, revert))] as const
  const [overviewApply, overviewRevert] = both<TopicOverviewView>((fn) => (view) => ({
    ...view,
    topic: fn(view.topic),
  }))
  const [workshopApply, workshopRevert] = both<TopicWorkshop>((fn) => (view) => ({ ...view, topic: fn(view.topic) }))
  const [pageApply, pageRevert] = both(inPage)
  return undoAll([
    change(client, { queryKey: topicKeys.overview(topicId), exact: true }, overviewApply, overviewRevert),
    change(client, { queryKey: topicKeys.lists() }, ...both(inCatalogue)),
    change(client, { queryKey: homeKeys.view(), exact: true }, ...both(inHome)),
    change(client, { queryKey: authoringKeys.contributed(), exact: true }, pageApply, pageRevert),
    change(client, { queryKey: authoringKeys.created(), exact: true }, pageApply, pageRevert),
    change(client, { queryKey: authoringKeys.workshop(topicId), exact: true }, workshopApply, workshopRevert),
  ])
}

/** Change des champs de la carte d'un sujet ; l'inverse remet les valeurs précédentes des seuls champs inchangés depuis. */
export function changeTopicFields(client: QueryClient, topicId: string, fields: Partial<TopicCardView>): Undo {
  const before = findTopicCard(client, topicId)
  if (!before)
    return changeTopicCard(
      client,
      topicId,
      (topic) => ({ ...topic, ...fields }),
      (topic) => topic,
    )
  const previous = Object.fromEntries(Object.keys(fields).map((key) => [key, before[key as keyof TopicCardView]]))
  return changeTopicCard(
    client,
    topicId,
    (topic) => ({ ...topic, ...fields }),
    (topic) => {
      const unchanged = Object.keys(fields).filter(
        (key) => topic[key as keyof TopicCardView] === fields[key as keyof TopicCardView],
      )
      return { ...topic, ...Object.fromEntries(unchanged.map((key) => [key, previous[key]])) }
    },
  )
}

/** Première carte connue d'un sujet dans le cache (fiche, atelier, listes). */
export function findTopicCard(client: QueryClient, topicId: string): TopicCardView | undefined {
  const matches = (topic: TopicCardView) => topic.topicId === topicId
  return (
    client.getQueryData(topicKeys.overview(topicId))?.topic ??
    client.getQueryData(authoringKeys.workshop(topicId))?.topic ??
    client.getQueryData(authoringKeys.contributed())?.content.find(matches) ??
    client
      .getQueriesData<InfiniteData<TopicPage, number>>({ queryKey: topicKeys.lists() })
      .flatMap(([, data]) => data?.pages.flatMap((page) => page.topics) ?? [])
      .find(matches) ??
    Object.values(client.getQueryData(homeKeys.view()) ?? {})
      .flat()
      .find(matches)
  )
}
