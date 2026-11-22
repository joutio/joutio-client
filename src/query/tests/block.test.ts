import type { ChallengeView } from '../../features/challenges/types.js'
import type { MeView } from '../../features/me/types.js'
import type { PlayerCardView, PlayerProfileView, UserRefView } from '../../features/profile/types.js'
import type { PageResponse } from '../../types/common.js'
import { QueryClient, type InfiniteData } from '@tanstack/query-core'
import { describe, expect, it } from 'vitest'
import { applyBlock } from '../block.js'
import { queryKeys } from '../keys.js'

const ME = 'me'
const card = (userId: string): PlayerCardView => ({ userId, pseudonym: userId, avatarOptions: null, rating: 1000, following: true, presence: null, suspended: false, premium: false })
const pages = (...items: PlayerCardView[]): InfiniteData<PageResponse<PlayerCardView>> => ({
  pageParams: [0],
  pages: [{ content: items, page: 0, size: 20, totalElements: items.length, totalPages: 1, first: true, last: true }],
})
const ref = (userId: string) => ({ userId, pseudonym: userId }) as UserRefView
const challenge = (id: string, opponent: string, status: ChallengeView['status']) => ({ challengeId: id, challenger: ref(ME), opponent: ref(opponent), status }) as ChallengeView

function seeded() {
  const client = new QueryClient()
  client.setQueryData(queryKeys.profiles.profile('lea'), { userId: 'lea', pseudonym: 'Léa', following: true, blocked: false, followersCount: 4, followingCount: 2 } as PlayerProfileView)
  client.setQueryData(queryKeys.me(), { userId: ME, followingCount: 3, followersCount: 5 } as MeView)
  client.setQueryData(queryKeys.contacts.list(ME, 'following', '', 'ALPHA'), pages(card('bob'), card('lea')))
  client.setQueryData(queryKeys.contacts.list(ME, 'followers', '', 'ALPHA'), pages(card('lea')))
  client.setQueryData(queryKeys.challenges(), [challenge('c1', 'lea', 'PENDING'), challenge('c2', 'lea', 'ACCEPTED'), challenge('c3', 'bob', 'PENDING')])
  client.setQueryData(queryKeys.blockedPlayers(), [] as UserRefView[])
  return client
}

describe('applyBlock', () => {
  it('removes follows both ways and pending challenges, without refetching', () => {
    const client = seeded()
    applyBlock(client, ME, 'lea', true)

    expect(client.getQueryData(queryKeys.profiles.profile('lea'))).toMatchObject({ blocked: true, following: false, followersCount: 3, followingCount: 1 })
    expect(client.getQueryData(queryKeys.me())).toMatchObject({ followingCount: 2, followersCount: 4 })
    const ids = (key: readonly unknown[]) => client.getQueryData<InfiniteData<PageResponse<PlayerCardView>>>(key)?.pages[0].content.map((item) => item.userId)
    expect(ids(queryKeys.contacts.list(ME, 'following', '', 'ALPHA'))).toEqual(['bob'])
    expect(ids(queryKeys.contacts.list(ME, 'followers', '', 'ALPHA'))).toEqual([])
    expect(client.getQueryData<ChallengeView[]>(queryKeys.challenges())?.map((item) => item.challengeId)).toEqual(['c2', 'c3'])
    expect(client.getQueryData<UserRefView[]>(queryKeys.blockedPlayers())?.map((item) => item.userId)).toEqual(['lea'])
  })

  it('unblocks the profile and drops the row from my blocked players', () => {
    const client = seeded()
    applyBlock(client, ME, 'lea', true)
    applyBlock(client, ME, 'lea', false)

    expect(client.getQueryData(queryKeys.profiles.profile('lea'))).toMatchObject({ blocked: false, following: false })
    expect(client.getQueryData<UserRefView[]>(queryKeys.blockedPlayers())).toEqual([])
  })
})
