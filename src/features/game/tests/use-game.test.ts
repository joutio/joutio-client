// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
import { REWARD_POLL, useGameResult } from '../hooks/use-game.js'
import { useGameStream } from '../hooks/use-game-stream.js'
import { gameKeys } from '../query/keys.js'
import type { ActiveGameView, GameResultView } from '../types.js'

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
  afterEach(() => vi.useRealTimers())

  const result = (reward: GameResultView['reward'], botGame = false) => ({ reward, botGame }) as GameResultView

  it('reads the result again while the reward is missing, then never again', async () => {
    vi.useFakeTimers()
    const answers = [result(null), result(null), result({ xp: 120, victoryBonus: 30 })]
    const http = fakeHttp({ get: () => answers.shift() ?? result({ xp: 120, victoryBonus: 30 }) })
    const { result: hook } = renderWithJoutio(() => useGameResult('g1'), { http })

    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(hook.current.data?.reward).toBeNull()
    await act(async () => vi.advanceTimersByTimeAsync(REWARD_POLL.intervalMs))
    await act(async () => vi.advanceTimersByTimeAsync(REWARD_POLL.intervalMs))
    await act(async () => vi.advanceTimersByTimeAsync(10))
    expect(hook.current.data?.reward).toEqual({ xp: 120, victoryBonus: 30 })
    await act(async () => vi.advanceTimersByTimeAsync(REWARD_POLL.intervalMs * 5))
    expect(http.get).toHaveBeenCalledTimes(3)
  })

  it('does not wait for a reward on a training game', async () => {
    vi.useFakeTimers()
    const http = fakeHttp({ get: () => result(null, true) })
    renderWithJoutio(() => useGameResult('g1'), { http })
    await act(async () => vi.advanceTimersByTimeAsync(REWARD_POLL.intervalMs * 3))
    expect(http.get).toHaveBeenCalledTimes(1)
  })

  it('gives up after REWARD_POLL.reads reads', async () => {
    vi.useFakeTimers()
    const http = fakeHttp({ get: () => result(null) })
    renderWithJoutio(() => useGameResult('g1'), { http })
    await act(async () => vi.advanceTimersByTimeAsync(REWARD_POLL.intervalMs * (REWARD_POLL.reads + 5)))
    expect(http.get).toHaveBeenCalledTimes(REWARD_POLL.reads)
  })
})
