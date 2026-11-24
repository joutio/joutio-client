import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'
import type { HttpClient } from '../http.js'
import type { RealtimeTransport } from '../realtime/transport.js'

/** Ce que l'app fournit une fois, à la racine : HTTP, temps réel et horloge. */
export interface JoutioRuntime {
  http: HttpClient
  realtime: RealtimeTransport
  /** Instant courant en epoch ms (`Date.now` dans les apps, une horloge figée dans les tests). */
  clock: () => number
}

export interface JoutioClientProviderProps extends JoutioRuntime {
  queryClient: QueryClient
  children?: ReactNode
}

const JoutioContext = createContext<JoutioRuntime | null>(null)

/**
 * Racine de la lib : pose le `QueryClient` et le runtime. Les hooks de `@joutio/client` lisent tout ici ; l'app ne
 * touche jamais au cache.
 */
export function JoutioClientProvider({ http, realtime, clock, queryClient, children }: JoutioClientProviderProps) {
  const runtime = useMemo(() => ({ http, realtime, clock }), [http, realtime, clock])
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(JoutioContext.Provider, { value: runtime }, children),
  )
}

export function useJoutio(): JoutioRuntime {
  const runtime = useContext(JoutioContext)
  if (!runtime) throw new Error('JoutioClientProvider manquant')
  return runtime
}
