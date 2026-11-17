import { describe, expect, it } from 'vitest'
import type { HttpClient, HttpQuery } from './http.js'
import { headToHeadQuery, meQuery, profileQuery, recommendationsQuery, topicLeaderboardQuery } from './reads.js'

const recorder = () => {
  const calls: { path: string; query?: HttpQuery }[] = []
  const http: HttpClient = {
    get: <T>(path: string, options?: { query?: HttpQuery }) => {
      calls.push({ path, query: options?.query })
      return Promise.resolve({} as T)
    },
  }
  return { http, calls }
}

describe('shared reads', () => {
  it('pairs the shared key with its BFF path', async () => {
    const { http, calls } = recorder()
    const me = meQuery(http)
    await me.queryFn()
    expect(me.queryKey).toEqual(['me'])
    expect(calls).toEqual([{ path: '/api/me', query: undefined }])
  })

  it('encodes identifiers and passes query parameters', async () => {
    const { http, calls } = recorder()
    await profileQuery(http, 'a/b').queryFn()
    await headToHeadQuery(http, 'u1', 'u2').queryFn()
    await recommendationsQuery(http, ['SCIENCE', 'HISTORY']).queryFn()
    await topicLeaderboardQuery(http, 't1').queryFn()
    expect(calls).toEqual([
      { path: '/api/profiles/a%2Fb', query: undefined },
      { path: '/api/profiles/u1/head-to-head', query: { against: 'u2' } },
      { path: '/api/me/onboarding/recommendations', query: { interests: 'SCIENCE,HISTORY' } },
      { path: '/api/topics/t1/leaderboard', query: { period: 'ALL_TIME', scope: 'WORLD', page: 0, size: 10 } },
    ])
  })
})
