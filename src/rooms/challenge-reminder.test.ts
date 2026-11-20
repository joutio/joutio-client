import { describe, expect, it } from 'vitest'
import { afterReminder, remindDelay } from './challenge-reminder.js'

const NOW = Date.parse('2026-11-20T10:00:00Z')

describe('remindDelay', () => {
  it('is zero once the reminder is allowed', () => {
    expect(remindDelay({ remindableAt: '2026-11-20T09:59:00Z' }, NOW)).toBe(0)
  })

  it('counts down to the next allowed reminder', () => {
    expect(remindDelay({ remindableAt: '2026-11-20T10:04:00Z' }, NOW)).toBe(4 * 60 * 1000)
  })
})

describe('afterReminder', () => {
  it('pushes the next reminder ten minutes away', () => {
    expect(remindDelay(afterReminder({ remindableAt: '2026-11-20T09:59:00Z' }, NOW), NOW)).toBe(10 * 60 * 1000)
  })
})
