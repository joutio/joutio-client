import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type { PageResponse } from '../../../core/types/common.js'
import { meKeys } from '../../me/query/keys.js'
import type { MeView } from '../../me/types.js'
import { profileKeys } from '../../profile/query/keys.js'
import type { PlayerCardView, PlayerProfileView } from '../../profile/types.js'
import { applyPlayerFollow } from '../cache/follow.js'
import { contactKeys } from '../query/keys.js'

const ME = 'me'
type Pages = InfiniteData<PageResponse<PlayerCardView>, number>
const card = (userId: string, pseudonym: string): PlayerCardView => ({
  userId,
  pseudonym,
  avatarOptions: null,
  rating: 1000,
  following: true,
  presence: null,
  suspended: false,
  premium: false,
})
const pages = (...content: PlayerCardView[][]): Pages => ({
  pageParams: content.map((_page, index) => index),
  pages: content.map((items, index) => ({
    content: items,
    page: index,
    size: 2,
    totalElements: content.flat().length,
    totalPages: content.length,
    first: index === 0,
    last: index === content.length - 1,
  })),
})
const profile = (userId: string, pseudonym: string, following: boolean) =>
  ({
    userId,
    pseudonym,
    following,
    followersCount: 10,
    avatarOptions: null,
    presence: null,
    suspended: false,
    premium: false,
    progression: { rating: 1200 },
  }) as unknown as PlayerProfileView
const names = (data: Pages | undefined) => data?.pages.flatMap((page) => page.content.map((item) => item.pseudonym))
const list = (userId: string, direction: 'following' | 'followers', query = '', sort: 'ALPHA' | 'RECENT' = 'ALPHA') =>
  contactKeys.list({ userId, direction, query, sort })

function seeded(followingNow: boolean) {
  const client = new QueryClient()
  client.setQueryData(profileKeys.detail('b'), profile('b', 'Bruno', followingNow))
  client.setQueryData(meKeys.account(), { userId: ME, followingCount: 3, followersCount: 0 } as MeView)
  return client
}

describe('applyPlayerFollow', () => {
  it('flags the profile, counts and inserts the card at its place in my following lists, without refetching', () => {
    const client = seeded(false)
    client.setQueryData(list(ME, 'following'), pages([card('a', 'Alice'), card('c', 'Chloé')]))

    applyPlayerFollow(client, ME, 'b', true)

    expect(client.getQueryData(profileKeys.detail('b'))).toMatchObject({ following: true, followersCount: 11 })
    expect(client.getQueryData(meKeys.account())?.followingCount).toBe(4)
    expect(names(client.getQueryData(list(ME, 'following')))).toEqual(['Alice', 'Bruno', 'Chloé'])
  })

  it('leaves the card to pagination when it sorts after the last loaded page', () => {
    const client = seeded(false)
    const partial = pages([card('a', 'Alice'), card('c', 'Chloé')], [])
    partial.pages = partial.pages.slice(0, 1).map((page) => ({ ...page, last: false }))
    client.setQueryData(list(ME, 'following'), partial)
    client.setQueryData(profileKeys.detail('b'), profile('z', 'Zoé', false))

    applyPlayerFollow(client, ME, 'b', true)

    expect(names(client.getQueryData(list(ME, 'following')))).toEqual(['Alice', 'Chloé'])
  })

  it('removes the unfollowed player from my lists and only flags him elsewhere', () => {
    const client = seeded(true)
    client.setQueryData(list(ME, 'following', '', 'RECENT'), pages([card('a', 'Alice'), card('b', 'Bruno')]))
    client.setQueryData(list('other', 'followers', '', 'RECENT'), pages([card('b', 'Bruno')]))

    applyPlayerFollow(client, ME, 'b', false)

    expect(names(client.getQueryData(list(ME, 'following', '', 'RECENT')))).toEqual(['Alice'])
    expect(client.getQueryData(list('other', 'followers', '', 'RECENT'))?.pages[0]?.content[0]?.following).toBe(false)
  })

  it('skips my searches that do not match the pseudonym', () => {
    const client = seeded(false)
    client.setQueryData(list(ME, 'following', 'ali'), pages([card('a', 'Alice')]))

    applyPlayerFollow(client, ME, 'b', true)

    expect(names(client.getQueryData(list(ME, 'following', 'ali')))).toEqual(['Alice'])
  })

  it('undoes only this follow: a concurrent follow of another player stays', () => {
    const client = seeded(false)
    client.setQueryData(profileKeys.detail('d'), profile('d', 'Dora', false))
    client.setQueryData(list(ME, 'following'), pages([card('a', 'Alice')]))

    const undoBruno = applyPlayerFollow(client, ME, 'b', true)
    applyPlayerFollow(client, ME, 'd', true)
    undoBruno()

    expect(names(client.getQueryData(list(ME, 'following')))).toEqual(['Alice', 'Dora'])
    expect(client.getQueryData(meKeys.account())?.followingCount).toBe(4)
    expect(client.getQueryData(profileKeys.detail('b'))).toMatchObject({ following: false, followersCount: 10 })
  })
})
