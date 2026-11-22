import type { Language } from '../../types/common.js'
import { avatarEn } from './en.js'
import { avatarFr } from './fr.js'

type Labels<T> = { [K in keyof T]: T[K] extends string ? string : Labels<T[K]> }

/** Forme du dictionnaire de l'éditeur d'avatar : celle du français, qui fait foi. */
export type AvatarLabels = Labels<typeof avatarFr>

const DICTIONARIES: Record<string, AvatarLabels> = { fr: avatarFr, en: avatarEn }

/**
 * Libellé d'une clé `avatar.…` de l'éditeur d'avatar (`{{number}}` interpolé), dans la langue demandée avec repli sur
 * le français ; la clé brute à défaut.
 */
export function avatarLabel(language: Language | string, key: string, vars: Record<string, string | number> = {}): string {
  const path = key.replace(/^avatar\./, '').split('.')
  const find = (dictionary: AvatarLabels | undefined) => {
    let node: unknown = dictionary
    for (const part of path) node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined
    return typeof node === 'string' ? node : undefined
  }
  const label = find(DICTIONARIES[language]) ?? find(avatarFr)
  if (label === undefined) return key
  return label.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''))
}
