import { QueryClient } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'
import type { HttpClient } from '../core/http.js'
import { queryClientDefaults } from '../core/query/client.js'
import type { RealtimeTransport } from '../core/realtime/transport.js'
import { JoutioClientProvider } from '../core/runtime/context.js'

type Handler = (path: string, options?: { body?: unknown; query?: unknown }) => unknown

/**
 * Client HTTP de test : chaque verbe répond par `handlers[verb]` (valeur, promesse, ou exception levée) et garde ses
 * appels, pour vérifier qu'aucune lecture ne suit une commande.
 */
export function fakeHttp(handlers: Partial<Record<'get' | 'post' | 'put' | 'delete', Handler>> = {}) {
  const verb = (name: 'get' | 'post' | 'put' | 'delete') =>
    vi.fn(async (path: string, options?: { body?: unknown; query?: unknown }) => handlers[name]?.(path, options))
  return { get: verb('get'), post: verb('post'), put: verb('put'), delete: verb('delete') } satisfies Record<
    keyof HttpClient,
    unknown
  >
}

/** Commande en attente, résolue ou rejetée par le test : le changement optimiste se lit entre les deux. */
export function deferred<T = void>() {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((ok, ko) => {
    resolve = ok
    reject = ko
  })
  return { promise, resolve, reject }
}

/** Transport temps réel de test : `push` simule une trame, `reconnect` une reconnexion. */
export function fakeRealtime() {
  const listeners = new Map<string, Set<{ onMessage: (message: { body: string }) => void; onConnect?: () => void }>>()
  const transport: RealtimeTransport = {
    subscribe: (destination, onMessage, onConnect) => {
      const entry = { onMessage, onConnect }
      const set = listeners.get(destination) ?? new Set()
      set.add(entry)
      listeners.set(destination, set)
      onConnect?.()
      return () => set.delete(entry)
    },
  }
  return {
    transport,
    push: (destination: string, frame: unknown) =>
      listeners.get(destination)?.forEach((entry) => entry.onMessage({ body: JSON.stringify(frame) })),
    reconnect: () => listeners.forEach((set) => set.forEach((entry) => entry.onConnect?.())),
    subscribed: (destination: string) => (listeners.get(destination)?.size ?? 0) > 0,
  }
}

export const NOW = Date.parse('2026-11-24T10:00:00Z')

/** Rend un hook sous `JoutioClientProvider`, avec la politique de cache des apps et une horloge figée. */
export function renderWithJoutio<T>(
  hook: () => T,
  {
    http = fakeHttp(),
    realtime = fakeRealtime().transport,
    client = createTestClient(),
  }: { http?: ReturnType<typeof fakeHttp>; realtime?: RealtimeTransport; client?: QueryClient } = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(JoutioClientProvider, {
      http: http as unknown as HttpClient,
      realtime,
      clock: () => NOW,
      queryClient: client,
      children,
    })
  return { ...renderHook(hook, { wrapper }), client, http }
}

export function createTestClient() {
  return new QueryClient({
    defaultOptions: { ...queryClientDefaults, queries: { ...queryClientDefaults.queries, retry: false } },
  })
}
