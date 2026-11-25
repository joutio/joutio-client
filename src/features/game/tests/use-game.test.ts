// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeHttp, fakeRealtime, renderWithJoutio } from '../../../testing/joutio.js'
import { homeKeys } from '../../home/query/keys.js'
import type { HomeView } from '../../home/types.js'
import { meKeys } from '../../me/query/keys.js'
import type { MeView } from '../../me/types.js'
import { profileKeys } from '../../profile/query/keys.js'
import type { PlayerProfileView } from '../../profile/types.js'
import { topicKeys } from '../../topics/query/keys.js'
import type { TopicOverviewView } from '../../topics/types.js'
import type { GameEvent } from '../domain/game-event.js'
import { LIVE_NOT_FOUND, type LiveUpdate } from '../../../core/realtime/use-live-query.js'
import { useGameResult } from '../hooks/use-game.js'
import { useGameStream } from '../hooks/use-game-stream.js'
import { gameKeys } from '../query/keys.js'
import type { ActiveGameView, GameResultView, GameRewardView } from '../types.js'

const frame = (sequenceNumber: number, payload: GameEvent) => ({
  aggregateId: 'g1',
  sequenceNumber,
  timestamp: new Date(0).toISOString(),
  eventType: payload.type,
  payload,
})
const created = frame(0, {
  type: 'GAME_CREATED',
  gameId: 'g1',
  topicId: 't1',
  player1Id: 'u1',
  player1Name: 'Nadia',
  player2Id: 'u2',
  player2Name: 'Sami',
  player2Type: 'HUMAN',
  botDifficulty: null,
  questionImageUrls: [],
})
const ended = frame(1, {
  type: 'GAME_ENDED',
  gameId: 'g1',
  winnerId: 'u1',
  player1FinalScore: 900,
  player2FinalScore: 400,
})
const active = (gameId: string) => ({ gameId }) as ActiveGameView

describe('useGameStream', () => {
  it('on game over, drops the game from the active games and marks the views it changes stale, without reading', async () => {
    const realtime = fakeRealtime()
    const http = fakeHttp({ get: (path) => (path === '/api/games/g1/events' ? [created] : undefined) })
    const { result, client } = renderWithJoutio(() => useGameStream('g1'), { http, realtime: realtime.transport })
    client.setQueryData(gameKeys.active('u1'), [active('g1'), active('g2')])
    const views = [
      meKeys.account(),
      profileKeys.detail('u1'),
      profileKeys.detail('u2'),
      topicKeys.overview('t1'),
      homeKeys.view(),
    ] as const
    client.setQueryData(meKeys.account(), {} as MeView)
    client.setQueryData(profileKeys.detail('u1'), {} as PlayerProfileView)
    client.setQueryData(profileKeys.detail('u2'), {} as PlayerProfileView)
    client.setQueryData(topicKeys.overview('t1'), {} as TopicOverviewView)
    client.setQueryData(homeKeys.view(), {} as HomeView)
    client.setQueryData(topicKeys.overview('t2'), {} as TopicOverviewView)

    await waitFor(() => expect(result.current.status?.loaded).toBe(true))
    expect(client.getQueryData(gameKeys.active('u1'))).toHaveLength(2)

    act(() => realtime.push('/topic/games/g1', ended))
    expect(result.current.state?.status).toBe('FINISHED')
    expect(client.getQueryData(gameKeys.active('u1'))).toEqual([active('g2')])
    views.forEach((queryKey) => expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true))
    expect(client.getQueryState(topicKeys.overview('t2'))?.isInvalidated).toBe(false)
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('learns the end from the history too (reopened or reconnected after the game)', async () => {
    const http = fakeHttp({ get: () => [created, ended] })
    const { result, client } = renderWithJoutio(() => useGameStream('g1'), { http })
    client.setQueryData(gameKeys.active('u1'), [active('g1')])
    await waitFor(() => expect(result.current.status?.loaded).toBe(true))
    expect(client.getQueryData(gameKeys.active('u1'))).toEqual([])
  })
})

describe('useGameResult', () => {
  const RESULT_PATH = '/api/games/g1/result'
  const LIVE_PATH = '/api/live/game-reward/g1%3Au1'
  const DESTINATION = '/topic/live/game-reward/g1:u1'
  const result = {
    myScore: 100,
    botGame: false,
    reward: null,
    progression: { rating: 1200, peakRating: 1200, ratedGames: 6 },
    topicMastery: {
      xp: 0,
      xpGained: 0,
      tier: 'NOVICE',
      nextTier: 'APPRENTI',
      tierProgressPercent: 0,
      tierRemainingXp: 100,
    },
    eloDelta: 0,
    rated: false,
    opponentRating: 1000,
    opponentEloDelta: 0,
    opponentRated: false,
    badges: [],
  } as unknown as GameResultView
  const reward = (version: number, opponentRating: number | null = null): LiveUpdate<GameRewardView> => ({
    view: 'game-reward',
    key: 'g1:u1',
    version,
    payload: {
      reward: { xp: 130, victoryBonus: 30 },
      rating: 1212,
      peakRating: 1212,
      ratedGames: 7,
      topicMastery: {
        xp: 130,
        xpGained: 130,
        tier: 'APPRENTI',
        nextTier: 'ADEPTE',
        tierProgressPercent: 10,
        tierRemainingXp: 270,
      },
      eloDelta: 12,
      rated: true,
      opponentRating,
      opponentEloDelta: opponentRating === null ? 0 : -12,
      opponentRated: opponentRating !== null,
      badges: version > 1 ? [{ code: 'DUELIST_FER', label: 'Dueliste de fer', family: 'VOLUME', tier: 'FER' }] : [],
    },
  })
  const notFound = () => Promise.reject({ type: LIVE_NOT_FOUND })

  function render(live: () => unknown) {
    const realtime = fakeRealtime()
    const http = fakeHttp({ get: (path) => (path === RESULT_PATH ? result : live()) })
    const rendered = renderWithJoutio(() => useGameResult('g1', 'u1'), { http, realtime: realtime.transport })
    return { ...rendered, http, realtime }
  }

  it('reads the result once and shows the reward pushed later, without any periodic read', async () => {
    const { result: hook, http, realtime } = render(notFound)

    await waitFor(() => expect(hook.current.data?.myScore).toBe(100))
    expect(hook.current.data?.reward).toBeNull()
    expect(realtime.subscribed(DESTINATION)).toBe(true)

    act(() => realtime.push(DESTINATION, reward(1)))
    await waitFor(() => expect(hook.current.data?.reward).toEqual({ xp: 130, victoryBonus: 30 }))
    expect(hook.current.data?.progression).toEqual({ rating: 1212, peakRating: 1212, ratedGames: 7 })
    expect(hook.current.data?.opponentRating).toBe(1000)

    act(() => realtime.push(DESTINATION, reward(2, 988)))
    await waitFor(() => expect(hook.current.data?.opponentRating).toBe(988))
    expect(hook.current.data?.badges.map((badge) => badge.code)).toEqual(['DUELIST_FER'])
    expect(hook.current.data?.opponentRating).toBe(988)
    expect(hook.current.data?.opponentEloDelta).toBe(-12)

    expect(http.get.mock.calls.map(([path]) => path).sort()).toEqual([RESULT_PATH, LIVE_PATH])
  })

  it('shows a reward already computed from the first read', async () => {
    const { result: hook } = render(() => reward(1))
    await waitFor(() => expect(hook.current.data?.reward).toEqual({ xp: 130, victoryBonus: 30 }))
  })

  it('keeps the result rating when the reward has none', async () => {
    const old = reward(1)
    const { result: hook } = render(() => ({ ...old, payload: { ...old.payload, rating: null } }))
    await waitFor(() => expect(hook.current.data?.reward).toEqual({ xp: 130, victoryBonus: 30 }))
    expect(hook.current.data?.progression.rating).toBe(1200)
  })

  it('reads nothing live without the player', () => {
    const realtime = fakeRealtime()
    const http = fakeHttp({ get: () => result })
    renderWithJoutio(() => useGameResult('g1', undefined), { http, realtime: realtime.transport })
    expect(realtime.subscribed(DESTINATION)).toBe(false)
    expect(http.get).not.toHaveBeenCalledWith(LIVE_PATH, expect.anything())
  })
})
