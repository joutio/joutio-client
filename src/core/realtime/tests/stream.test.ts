import { describe, expect, it, vi } from 'vitest'
import { EventStream, type EventEnvelope } from '../stream.js'

type Payload = { type: string; n: number }
const envelope = (sequenceNumber: number): EventEnvelope<Payload> => ({
  aggregateId: 'g1',
  sequenceNumber,
  timestamp: new Date(0).toISOString(),
  eventType: 'E',
  payload: { type: 'E', n: sequenceNumber },
})

function setup(history: EventEnvelope<Payload>[]) {
  let push: (body: string) => void = () => {}
  const load = vi.fn(() => Promise.resolve(history))
  let connect = () => {}
  const stream = new EventStream<Payload, number[]>({
    key: 'game:g1',
    initial: () => [],
    apply: (state, payload) => [...state, payload.n],
    source: {
      load,
      subscribe: (onFrame, onConnect) => {
        push = onFrame
        connect = onConnect
        return () => {}
      },
    },
  })
  stream.start()
  return {
    stream,
    load,
    reconnect: () => connect(),
    push: (seq: number) => push(JSON.stringify(envelope(seq))),
    raw: (body: string) => push(body),
  }
}

describe('EventStream', () => {
  it('déduplique historique et live par numéro de séquence', async () => {
    const { stream, push } = setup([envelope(0), envelope(1)])
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    push(1)
    push(2)
    expect(stream.getSnapshot()).toEqual([0, 1, 2])
  })

  it('tamponne les trames live arrivées pendant le chargement', async () => {
    let push: (body: string) => void = () => {}
    let resolveLoad!: (history: EventEnvelope<Payload>[]) => void
    const load = vi.fn(() => new Promise<EventEnvelope<Payload>[]>((resolve) => (resolveLoad = resolve)))
    const stream = new EventStream<Payload, number[]>({
      key: 'game:g1',
      initial: () => [],
      apply: (state, payload) => [...state, payload.n],
      source: {
        load,
        subscribe: (onFrame) => {
          push = onFrame
          return () => {}
        },
      },
    })
    stream.start()
    push(JSON.stringify(envelope(0)))
    push(JSON.stringify(envelope(1)))
    resolveLoad([envelope(0), envelope(1)])
    await vi.waitFor(() => expect(stream.getSnapshot()).toEqual([0, 1]))
    stream.stop()
  })

  it('rejoue l’historique à la reconnexion et ignore les doublons', async () => {
    const { stream, load, push, reconnect } = setup([envelope(0)])
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    push(1)
    load.mockResolvedValueOnce([envelope(0), envelope(1), envelope(2)])
    reconnect()
    await vi.waitFor(() => expect(stream.getSnapshot()).toEqual([0, 1, 2]))
    push(2)
    expect(stream.getSnapshot()).toEqual([0, 1, 2])
    stream.stop()
  })

  it('relit l’historique sur un trou de séquence (abonné qui rejoint un flux ouvert)', async () => {
    const history = [envelope(0), envelope(1)]
    const { stream, load, push } = setup(history)
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    history.push(envelope(2), envelope(3))
    push(3)
    await vi.waitFor(() => expect(stream.getSnapshot()).toEqual([0, 1, 2, 3]))
    expect(load).toHaveBeenCalledTimes(2)
    push(3)
    push(4)
    expect(stream.getSnapshot()).toEqual([0, 1, 2, 3, 4])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('404 définitif : notFound', async () => {
    const fresh = new EventStream<Payload, number[]>({
      key: 'game:g1',
      initial: () => [],
      apply: (state, payload) => [...state, payload.n],
      source: {
        load: () => Promise.reject({ statusCode: 404 }),
        subscribe: () => () => {},
      },
    })
    fresh.start()
    await vi.waitFor(() => expect(fresh.getStatus().notFound).toBe(true))
    fresh.stop()
  })

  it('erreur transitoire : non chargé, sans notFound', async () => {
    const fresh = new EventStream<Payload, number[]>({
      key: 'game:g1',
      initial: () => [],
      apply: (state, payload) => [...state, payload.n],
      source: {
        load: () => Promise.reject(new Error('network')),
        subscribe: () => () => {},
      },
    })
    fresh.start()
    await vi.waitFor(() => expect(fresh.getStatus().loaded).toBe(false))
    expect(fresh.getStatus().notFound).toBe(false)
    fresh.stop()
  })

  it('ignore les trames malformées', async () => {
    const { stream, raw } = setup([envelope(0)])
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    raw('pas du json')
    raw(JSON.stringify({ sequenceNumber: 1 }))
    expect(stream.getSnapshot()).toEqual([0])
  })

  it('resync() rejoue l’historique à la demande', async () => {
    const { stream, load } = setup([envelope(0)])
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    load.mockResolvedValueOnce([envelope(0), envelope(1)])
    stream.resync()
    await vi.waitFor(() => expect(stream.getSnapshot()).toEqual([0, 1]))
    expect(load).toHaveBeenCalledTimes(2)
    stream.stop()
    stream.resync()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('onEvent suit chaque événement replié, avec l’état à jour', async () => {
    const seen: [number[], number][] = []
    const stream = new EventStream<Payload, number[]>({
      key: 'game:g1',
      initial: () => [],
      apply: (state, payload) => [...state, payload.n],
      onEvent: (state, payload) => seen.push([state, payload.n]),
      source: { load: () => Promise.resolve([envelope(0), envelope(1)]), subscribe: () => () => {} },
    })
    stream.start()
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    expect(seen).toEqual([
      [[0], 0],
      [[0, 1], 1],
    ])
    stream.stop()
  })

  it('le lecteur d’historique sait si le flux attend encore son premier chargement', async () => {
    const fresh: boolean[] = []
    const stream = new EventStream<Payload, number[]>(
      {
        key: 'game:g1',
        initial: () => [],
        apply: (state, payload) => [...state, payload.n],
        source: { load: () => Promise.resolve([envelope(0)]), subscribe: () => () => {} },
      },
      (load, isFresh) => {
        fresh.push(isFresh())
        return load()
      },
    )
    stream.start()
    await vi.waitFor(() => expect(stream.getStatus().loaded).toBe(true))
    stream.resync()
    await vi.waitFor(() => expect(fresh).toEqual([true, false]))
    stream.stop()
  })
})
