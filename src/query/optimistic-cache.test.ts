import { QueryClient } from '@tanstack/query-core'
import { describe, expect, it } from 'vitest'
import { optimisticUpdate, rollbackChange } from './optimistic-cache.js'

describe('optimisticUpdate', () => {
  it('rolls back only its own change, keeping a later edit of another field', async () => {
    const client = new QueryClient()
    client.setQueryData(['me'], { pseudonym: 'Nadia', bio: 'avant' })
    const { rollback } = await optimisticUpdate(client, [['me']], () => client.setQueryData(['me'], { pseudonym: 'Nadia_42', bio: 'avant' }))
    client.setQueryData(['me'], { pseudonym: 'Nadia_42', bio: 'après' })

    rollback()

    expect(client.getQueryData(['me'])).toEqual({ pseudonym: 'Nadia', bio: 'après' })
  })

  it('restores a counter by its delta and keyed lists by identity', () => {
    expect(rollbackChange(3, 4, 6, 'followersCount')).toBe(5)
    const before = [{ userId: 'a' }, { userId: 'b' }]
    const after = [{ userId: 'a' }]
    const current = [{ userId: 'a' }, { userId: 'c' }]
    expect(rollbackChange(before, after, current)).toEqual([{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }])
  })
})
