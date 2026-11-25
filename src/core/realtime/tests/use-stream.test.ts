// @vitest-environment jsdom
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRealtime, renderWithJoutio } from '../../../testing/joutio.js'
import type { EventEnvelope, EventStreamOptions } from '../stream.js'
import { NEW_AGGREGATE_GRACE, useEventStream } from '../use-stream.js'

type Payload = { type: string; n: number }
const envelope = (sequenceNumber: number): EventEnvelope<Payload> => ({
  aggregateId: 'a1',
  sequenceNumber,
  timestamp: new Date(0).toISOString(),
  eventType: 'E',
  payload: { type: 'E', n: sequenceNumber },
})
const notFound = { statusCode: 404 }

function render(load: () => Promise<EventEnvelope<Payload>[]>) {
  const realtime = fakeRealtime()
  const options: EventStreamOptions<Payload, number[]> = {
    key: 'agg:a1',
    initial: () => [],
    apply: (state, payload) => [...state, payload.n],
    source: {
      load,
      subscribe: (onFrame, onConnect) =>
        realtime.transport.subscribe('/topic/a1', (message) => onFrame(message.body), onConnect),
    },
  }
  return { ...renderWithJoutio(() => useEventStream(options), { realtime: realtime.transport }), realtime }
}

describe('useEventStream', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits through the grace delay when a new aggregate answers 404 first', async () => {
    const load = vi
      .fn<() => Promise<EventEnvelope<Payload>[]>>()
      .mockRejectedValueOnce(notFound)
      .mockRejectedValueOnce(notFound)
      .mockResolvedValue([envelope(0)])
    const { result } = render(load)

    await act(async () => vi.advanceTimersByTimeAsync(NEW_AGGREGATE_GRACE.delayMs))
    expect(result.current.status).toEqual({ loaded: false, notFound: false })
    await act(async () => vi.advanceTimersByTimeAsync(NEW_AGGREGATE_GRACE.delayMs))
    expect(result.current.status).toEqual({ loaded: true, notFound: false })
    expect(result.current.state).toEqual([0])
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('reports notFound once the grace delay is over', async () => {
    const load = vi.fn<() => Promise<EventEnvelope<Payload>[]>>().mockRejectedValue(notFound)
    const { result } = render(load)

    await act(async () => vi.advanceTimersByTimeAsync(NEW_AGGREGATE_GRACE.delayMs * (NEW_AGGREGATE_GRACE.retries - 1)))
    expect(result.current.status?.notFound).toBe(false)
    await act(async () => vi.advanceTimersByTimeAsync(NEW_AGGREGATE_GRACE.delayMs))
    expect(result.current.status?.notFound).toBe(true)
    expect(load).toHaveBeenCalledTimes(NEW_AGGREGATE_GRACE.retries + 1)
  })

  it('does not retry a 404 on an aggregate already loaded, nor any other error', async () => {
    const load = vi.fn<() => Promise<EventEnvelope<Payload>[]>>().mockResolvedValueOnce([envelope(0)])
    const { result } = render(load)
    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(result.current.status?.loaded).toBe(true)

    load.mockRejectedValueOnce(notFound)
    act(() => result.current.resync())
    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(result.current.status?.notFound).toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('resync() replays the REST history on demand', async () => {
    const load = vi.fn<() => Promise<EventEnvelope<Payload>[]>>().mockResolvedValueOnce([envelope(0)])
    const { result } = render(load)
    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(result.current.state).toEqual([0])

    load.mockResolvedValueOnce([envelope(0), envelope(1), envelope(2)])
    act(() => result.current.resync())
    await act(async () => vi.advanceTimersByTimeAsync(0))
    expect(result.current.state).toEqual([0, 1, 2])
  })
})
