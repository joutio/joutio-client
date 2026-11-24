import { describe, expect, it } from 'vitest'
import { en, fr, languageOf, pluralOf, translate } from '../index.js'

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',')

describe('i18n', () => {
  it('a les mêmes clés en français et en anglais', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
  })

  it('garde les mêmes {valeurs} dans les deux langues', () => {
    const differ = (Object.keys(fr) as (keyof typeof fr)[]).filter(
      (key) => placeholders(fr[key]) !== placeholders(en[key]),
    )
    expect(differ).toEqual([])
  })

  it("n'a aucun texte anglais vide", () => {
    expect(
      Object.entries(en)
        .filter(([, text]) => text.trim() === '')
        .map(([key]) => key),
    ).toEqual([])
  })

  it('interpole et retombe sur le français', () => {
    expect(translate('fr', 'onboarding.code.resendIn', { time: '0:30' })).toBe('Renvoyer le code dans 0:30')
    expect(translate('en', 'nav.home')).toBe('Home')
  })

  it('déduit la langue d’une locale', () => {
    expect(languageOf('en-GB')).toBe('en')
    expect(languageOf('fr_FR')).toBe('fr')
    expect(languageOf('de')).toBe('fr')
    expect(languageOf(undefined)).toBe('fr')
  })

  it('choisit la forme du pluriel', () => {
    expect(pluralOf('fr', 0)).toBe('one')
    expect(pluralOf('en', 0)).toBe('other')
    expect(pluralOf('en', 1)).toBe('one')
  })
})
