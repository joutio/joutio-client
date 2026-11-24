// @vitest-environment jsdom
import { waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import { useContacts } from '../hooks/use-contacts.js'
import type { ContactsList } from '../types.js'

it('keeps the list while sorting the same player, and clears it when the list changes', async () => {
  let first = true
  const http = fakeHttp({
    get: () => {
      if (!first) return new Promise(() => {})
      first = false
      return { content: [], page: 0, last: true }
    },
  })
  const initial: ContactsList = { userId: 'a', direction: 'followers', query: '', sort: 'ALPHA' }
  let current = initial
  const { result, rerender } = renderWithJoutio(() => useContacts(current), { http })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  current = { ...initial, sort: 'RECENT' }
  rerender()
  expect(result.current.isPlaceholderData).toBe(true)
  current = { ...initial, direction: 'following' }
  rerender()
  expect(result.current.data).toBeUndefined()
  current = { ...initial, userId: 'b' }
  rerender()
  expect(result.current.data).toBeUndefined()
  const calls = http.get.mock.calls.length
  current = { ...initial, userId: undefined }
  rerender()
  expect(result.current.data).toBeUndefined()
  expect(http.get).toHaveBeenCalledTimes(calls)
})
