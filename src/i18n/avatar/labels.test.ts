import { describe, expect, it } from 'vitest'
import { avatarLabel } from './labels.js'

describe('avatarLabel', () => {
  it('reads the label in the requested language', () => {
    expect(avatarLabel('fr', 'avatar.sections.hair')).toBe('Coiffure')
    expect(avatarLabel('en', 'avatar.sections.hair')).toBe('Hairstyle')
    expect(avatarLabel('en', 'avatar.variants.lorelei.eyes.variant15')).toBe('Wink')
  })

  it('interpolates values and falls back to French, then to the raw key', () => {
    expect(avatarLabel('en', 'avatar.humanized.variant', { number: 3 })).toBe('Variant 3')
    expect(avatarLabel('de', 'avatar.none')).toBe('Aucun')
    expect(avatarLabel('en', 'avatar.unknown.key')).toBe('avatar.unknown.key')
  })
})
