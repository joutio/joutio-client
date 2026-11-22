import type { Language } from '../types/common.js'
import { en } from './en.js'
import { fr, type Messages } from './fr.js'

/**
 * Textes des apps (web et mobile), en français et en anglais (`MeView.language`). Les textes français sont ceux du lab,
 * mot pour mot. Pas de bibliothèque : dictionnaires typés (`fr` fait foi, `en` doit avoir les mêmes clés) et
 * interpolation `{nom}`. Les clés propres au mobile portent le préfixe `mobile.` ; le reste est commun (ADR 0002).
 */
export type MessageKey = keyof Messages

export type MessageValues = Record<string, string | number>

export const LANGUAGES: readonly Language[] = ['fr', 'en']

export const dictionaries: Record<Language, Messages> = { fr, en }

/** Langue prise en charge la plus proche d'une locale (`en-GB` → `en`) ; le français à défaut. */
export function languageOf(locale: string | null | undefined): Language {
  const base = (locale ?? '').toLowerCase().split(/[-_]/)[0]
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Language) : 'fr'
}

/** Texte d'une clé dans `language` (le français à défaut), avec ses `{valeurs}` interpolées. */
export function translate(language: Language, key: MessageKey, values?: MessageValues): string {
  const template = dictionaries[language]?.[key] ?? fr[key] ?? key
  return values ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : template
}

/** Vrai si `key` existe dans les dictionnaires : clé construite à partir d'un code serveur (`reason.${code}`). */
export function isMessageKey(key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(fr, key)
}

/** Clé du libellé d'un palier (`tier.OR`) ; `tokens.tier[*].label` reste le français du lab. */
export const tierKey = (tier: string): MessageKey => (isMessageKey(`tier.${tier}`) ? (`tier.${tier}` as MessageKey) : 'tier.FER')

/** Clé du libellé d'un univers (`category.SCIENCE`), `category.GENERAL` pour un code inconnu. */
export const categoryKey = (category: string | null | undefined): MessageKey =>
  isMessageKey(`category.${category}`) ? (`category.${category}` as MessageKey) : 'category.GENERAL'
