/** Paramètres d'URL d'une lecture ; une valeur absente (`undefined`, `null`) n'est pas envoyée. */
export type HttpQuery = Record<string, string | number | boolean | undefined | null>

/**
 * Client HTTP du BFF, tel que les deux apps l'implémentent (`lib/api`) : chemin relatif à l'API, réponse JSON typée,
 * erreur RFC 7807 levée, session gérée par l'app. Les fabriques de `query` ne connaissent que cette interface.
 */
export interface HttpClient {
  get<T>(path: string, options?: { query?: HttpQuery }): Promise<T>
}

/** Segment de chemin encodé : un identifiant ne peut jamais sortir de son segment. */
export const segment = (value: string) => encodeURIComponent(value)
