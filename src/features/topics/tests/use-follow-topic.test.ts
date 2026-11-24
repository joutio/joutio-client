// @vitest-environment jsdom
import type { InfiniteData } from '@tanstack/react-query'
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import { homeKeys } from '../../home/query/keys.js'
import { useFollowTopic } from '../hooks/use-topic-mutations.js'
import { topicKeys } from '../query/keys.js'
import type { CatalogueFilters, TopicCardView, TopicPage } from '../types.js'

const topic = (topicId: string, followed: boolean): TopicCardView =>
  ({ topicId, names: { fr: topicId }, followed, followersCount: 10, status: 'PUBLISHED' }) as unknown as TopicCardView
const catalogue = (...topics: TopicCardView[]): InfiniteData<TopicPage, number> => ({
  pageParams: [0],
  pages: [{ topics, last: true, page: 0 }],
})
const filters = (extra: Partial<CatalogueFilters>): CatalogueFilters => ({
  query: '',
  categories: [],
  sort: 'POPULAR',
  hideFollowed: false,
  ...extra,
})

describe('useFollowTopic', () => {
  it('flips the topic everywhere, follows the catalogue filters and the Followed rail, and undoes only itself', async () => {
    const pending = deferred()
    const http = fakeHttp({ put: () => pending.promise })
    const { result, client } = renderWithJoutio(
      () => ({ history: useFollowTopic('history'), art: useFollowTopic('art') }),
      { http },
    )
    client.setQueryData(topicKeys.overview('history'), { topic: topic('history', false) } as never)
    client.setQueryData(topicKeys.list(filters({})), catalogue(topic('history', false), topic('art', false)))
    client.setQueryData(
      topicKeys.list(filters({ hideFollowed: true })),
      catalogue(topic('history', false), topic('art', false)),
    )
    client.setQueryData(homeKeys.view(), {
      followedTopics: [],
      trendingTopics: [topic('history', false)],
      newTopics: [],
      recommendedTopics: [],
    })

    act(() => result.current.history.mutate(true))
    await waitFor(() =>
      expect(client.getQueryData(topicKeys.overview('history'))?.topic).toMatchObject({
        followed: true,
        followersCount: 11,
      }),
    )
    expect(client.getQueryData(topicKeys.list(filters({})))?.pages[0]?.topics[0]).toMatchObject({ followed: true })
    expect(
      client
        .getQueryData(topicKeys.list(filters({ hideFollowed: true })))
        ?.pages[0]?.topics.map((item) => item.topicId),
    ).toEqual(['art'])
    expect(client.getQueryData(homeKeys.view())?.followedTopics.map((item) => item.topicId)).toEqual(['history'])

    const art = deferred()
    http.put.mockImplementationOnce(() => art.promise)
    act(() => result.current.art.mutate(true))
    await waitFor(() => expect(client.getQueryData(homeKeys.view())?.followedTopics).toHaveLength(2))

    await act(async () => pending.reject(new Error('refused')))
    await waitFor(() => expect(result.current.history.isError).toBe(true))
    expect(client.getQueryData(topicKeys.overview('history'))?.topic).toMatchObject({
      followed: false,
      followersCount: 10,
    })
    expect(
      client
        .getQueryData(topicKeys.list(filters({ hideFollowed: true })))
        ?.pages[0]?.topics.map((item) => item.topicId),
    ).toEqual(['history'])
    expect(client.getQueryData(homeKeys.view())?.followedTopics.map((item) => item.topicId)).toEqual(['art'])
    expect(http.get).not.toHaveBeenCalled()
  })
})
