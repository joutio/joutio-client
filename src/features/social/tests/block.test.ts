import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type { PageResponse } from '../../../core/types/common.js'
import { meKeys } from '../../me/query/keys.js'
import type { MeView } from '../../me/types.js'
import { profileKeys } from '../../profile/query/keys.js'
import type { PlayerCardView, PlayerProfileView, UserRefView } from '../../profile/types.js'
import type { LiveUpdate } from '../../../core/realtime/use-live-query.js'
import { roomKeys } from '../../rooms/query/keys.js'
import type { RoomView } from '../../rooms/types.js'
import { applyBlock } from '../cache/block.js'
import { contactKeys } from '../query/keys.js'

const ME = 'me'
const card = (userId: string): PlayerCardView => ({
  userId,
  pseudonym: userId,
  avatarOptions: null,
  rating: 1000,
  following: true,
  presence: null,
  suspended: false,
  premium: false,
})
const pages = (...items: PlayerCardView[]): InfiniteData<PageResponse<PlayerCardView>, number> => ({
  pageParams: [0],
  pages: [{ content: items, page: 0, size: 20, totalElements: items.length, totalPages: 1, first: true, last: true }],
})
const room = (roomId: string, opponent: string, status: RoomView['status']) =>
  ({ roomId, status, opponent: { userId: opponent } }) as RoomView
const following = contactKeys.list({ userId: ME, direction: 'following', query: '', sort: 'ALPHA' })
const followers = contactKeys.list({ userId: ME, direction: 'followers', query: '', sort: 'ALPHA' })

function seeded() {
  const client = new QueryClient()
  client.setQueryData(profileKeys.detail('lea'), {
    userId: 'lea',
    pseudonym: 'Léa',
    following: true,
    blocked: false,
    followersCount: 4,
    followingCount: 2,
  } as PlayerProfileView)
  client.setQueryData(meKeys.account(), { userId: ME, followingCount: 3, followersCount: 5 } as MeView)
  client.setQueryData(following, pages(card('bob'), card('lea')))
  client.setQueryData(followers, pages(card('lea')))
  const rooms: LiveUpdate<RoomView[]> = {
    view: 'my-rooms',
    key: ME,
    version: 1,
    payload: [room('r1', 'lea', 'INVITED'), room('r2', 'lea', 'FETCHING_PLAYERS'), room('r3', 'bob', 'INVITED')],
  }
  client.setQueryData(roomKeys.mine(ME), rooms)
  client.setQueryData(meKeys.blocked(), [] as UserRefView[])
  return client
}

const ids = (data: InfiniteData<PageResponse<PlayerCardView>, number> | undefined) =>
  data?.pages[0]?.content.map((item) => item.userId)

describe('applyBlock', () => {
  it('removes follows both ways and the open rooms between us, without refetching', () => {
    const client = seeded()
    applyBlock(client, ME, 'lea', true)

    expect(client.getQueryData(profileKeys.detail('lea'))).toMatchObject({
      blocked: true,
      following: false,
      followersCount: 3,
      followingCount: 1,
    })
    expect(client.getQueryData(meKeys.account())).toMatchObject({ followingCount: 2, followersCount: 4 })
    expect(ids(client.getQueryData(following))).toEqual(['bob'])
    expect(ids(client.getQueryData(followers))).toEqual([])
    expect(client.getQueryData(roomKeys.mine(ME))?.payload.map((item) => item.roomId)).toEqual(['r2', 'r3'])
    expect(client.getQueryData(meKeys.blocked())?.map((item) => item.userId)).toEqual(['lea'])
  })

  it('undoes exactly the block, keeping what changed meanwhile', () => {
    const client = seeded()
    const undo = applyBlock(client, ME, 'lea', true)
    client.setQueryData(meKeys.account(), (me) => (me ? { ...me, pseudonym: 'Renamed' } : me))

    undo()

    expect(client.getQueryData(profileKeys.detail('lea'))).toMatchObject({
      blocked: false,
      following: true,
      followersCount: 4,
      followingCount: 2,
    })
    expect(client.getQueryData(meKeys.account())).toMatchObject({
      followingCount: 3,
      followersCount: 5,
      pseudonym: 'Renamed',
    })
    expect(ids(client.getQueryData(following))).toEqual(['bob', 'lea'])
    expect(ids(client.getQueryData(followers))).toEqual(['lea'])
    expect(client.getQueryData(roomKeys.mine(ME))?.payload.map((item) => item.roomId)).toEqual(['r1', 'r2', 'r3'])
    expect(client.getQueryData(meKeys.blocked())).toEqual([])
  })

  it('unblocks the profile and drops the row from my blocked players', () => {
    const client = seeded()
    applyBlock(client, ME, 'lea', true)
    applyBlock(client, ME, 'lea', false)

    expect(client.getQueryData(profileKeys.detail('lea'))).toMatchObject({ blocked: false, following: false })
    expect(client.getQueryData(meKeys.blocked())).toEqual([])
  })
})
