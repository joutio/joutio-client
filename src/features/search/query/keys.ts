import { typed } from '../../../core/query/keys.js'
import type { SuggestionView } from '../types.js'

export const searchKeys = {
  suggestions: (term: string, limit: number) => typed<SuggestionView[]>()(['search', 'suggestions', { term, limit }]),
}
