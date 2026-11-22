import type { Language } from '../types/common.js'

/** `2 418` (fr) ou `2,418` (en). */
export const formatNumber = (value: number, language: Language | string = 'fr') => new Intl.NumberFormat(language).format(value)

/** Date dans la langue de l'app, `Intl.DateTimeFormat` à options libres. */
export const formatDate = (date: Date | number, language: Language | string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(language, options).format(date)

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

/** Jour d'un groupe : `today`, `yesterday`, le nom du jour dans la semaine, puis « Dimanche 25 oct. ». */
export function dayLabel(date: Date, language: Language | string, labels: { today: string; yesterday: string }, now = new Date()) {
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((start(now) - start(date)) / 86_400_000)
  if (days <= 0) return labels.today
  if (days === 1) return labels.yesterday
  if (days < 7) return capitalize(formatDate(date, language, { weekday: 'long' }))
  return capitalize(formatDate(date, language, { weekday: 'long', day: 'numeric', month: 'short' }))
}

/** Forme du pluriel (`Intl.PluralRules`) : `one` pour 1 (et 0 en français), `other` sinon. */
export function pluralOf(language: Language | string, count: number): 'one' | 'other' {
  return new Intl.PluralRules(language).select(count) === 'one' ? 'one' : 'other'
}
