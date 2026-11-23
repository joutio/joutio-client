/** Contrats communs de la surface BFF (`docs/api/`), indépendants d'un domaine. */

export type Language = 'fr' | 'en'

/** Erreur HTTP normalisée (ProblemDetail RFC 7807 du BFF). */
export interface ApiError {
  message: string
  statusCode?: number
  title?: string
  detail?: string
  /** URI du problème (ex. `urn:joutio:authorization:accountSuspended`). */
  type?: string
  /** Propriétés propres au problème (ex. `limit`, `published`, `topicId` pour les limites du plan). */
  context?: Record<string, unknown>
}

/** Page Spring du BFF (`PageResponse`). */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

/** `{ id }` renvoyé par une création (`IdResponse` du SDK). */
export interface IdResponse {
  id: string
}
