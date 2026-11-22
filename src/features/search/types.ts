import type { TopicNames } from '../topics/types.js'

/** `GET /api/suggestions?q=&limit=` : résultat de la recherche globale (sujets et joueurs). */
export interface SuggestionView {
  type: 'TOPIC' | 'PLAYER'
  id: string
  label: string
  subtitle: string | null
  category: string | null
  imageUrl: string | null
  pictogramUrl: string | null
  avatarOptions: string | null
  names: TopicNames | null
  suspended: boolean
  /** Premium accordé (badge après le pseudonyme) ; un admin n'en a pas d'office. */
  premium: boolean
  /** Sujet éditorial de Joutio (badge « Officiel », 2026-11-15). */
  official?: boolean
}
