/** Paramètres d'URL d'une lecture ; une valeur absente (`undefined`, `null`) n'est pas envoyée. */
export type HttpQuery = Record<string, string | number | boolean | undefined | null>

/**
 * Signal d'annulation minimal : la lib ne connaît ni DOM ni plateforme (ADR 0001). Le `signal` du contexte React
 * Query et les `AbortSignal` des deux apps satisfont structurellement ce sous-ensemble.
 */
export interface AbortSignalLike {
  readonly aborted: boolean
  addEventListener(type: 'abort', listener: () => void): void
  removeEventListener(type: 'abort', listener: () => void): void
}

/**
 * Client HTTP du BFF, tel que les deux apps l'implémentent (`lib/api`) : chemin relatif à l'API, réponse JSON typée,
 * erreur RFC 7807 levée, session gérée par l'app. Les services de la lib ne connaissent que cette interface.
 */
export interface HttpClient {
  get<T>(path: string, options?: { query?: HttpQuery; signal?: AbortSignalLike }): Promise<T>
  post<T>(path: string, options?: { body?: unknown; query?: HttpQuery; signal?: AbortSignalLike }): Promise<T>
  put<T>(path: string, options?: { body?: unknown; query?: HttpQuery; signal?: AbortSignalLike }): Promise<T>
  delete<T>(path: string, options?: { body?: unknown; query?: HttpQuery; signal?: AbortSignalLike }): Promise<T>
}

/** Segment de chemin encodé : un identifiant ne peut jamais sortir de son segment. */
export const segment = (value: string) => encodeURIComponent(value)
