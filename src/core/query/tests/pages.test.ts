import { describe, expect, expectTypeOf, it } from 'vitest'
import type { useNotifications } from '../../../features/notifications/hooks/use-notifications.js'
import type { NotificationView } from '../../../features/notifications/types.js'
import type { useHistory } from '../../../features/profile/hooks/use-profile.js'
import type { GameHistoryItemView, PlayerCardView } from '../../../features/profile/types.js'
import type { useContacts } from '../../../features/social/hooks/use-contacts.js'
import type { PageResponse } from '../../types/common.js'
import { MAX_PAGES, nextPage, pageQuery } from '../pages.js'

type Pages<THook extends (...args: never[]) => { data: unknown }> =
  NonNullable<ReturnType<THook>['data']> extends {
    pages: infer P
  }
    ? P
    : never

describe('pageQuery', () => {
  it('types the pages of every paginated list as PageResponse, skipToken included', () => {
    expectTypeOf<Pages<typeof useHistory>>().toEqualTypeOf<PageResponse<GameHistoryItemView>[]>()
    expectTypeOf<Pages<typeof useContacts>>().toEqualTypeOf<PageResponse<PlayerCardView>[]>()
    expectTypeOf<Pages<typeof useNotifications>>().toEqualTypeOf<PageResponse<NotificationView>[]>()
  })

  it('reads page 0 first, then the next page until the last one', () => {
    const options = pageQuery(async (page) => ({ content: [], page, last: page === 1 }))
    expect(options.initialPageParam).toBe(0)
    expect(options.maxPages).toBe(MAX_PAGES)
    expect(nextPage({ page: 0, last: false })).toBe(1)
    expect(nextPage({ page: 1, last: true })).toBeUndefined()
  })

  it('skips the read without a fetch function', () => {
    expect(typeof pageQuery(undefined).queryFn).toBe('symbol')
  })
})
