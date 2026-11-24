import { z } from 'zod'
import type { MessageKey } from '../../../core/i18n/translate.js'
import { birthDateIssue } from '../domain/age.js'
import { pseudonymIssue, type PseudonymIssue } from '../domain/pseudonym.js'

/** Bio du profil (miroir de `joutio-profile`). */
export const MAX_BIO = 160

export const PSEUDONYM_ISSUE_KEYS: Record<PseudonymIssue, MessageKey> = {
  tooShort: 'settings.pseudonymTooShort',
  tooLong: 'settings.pseudonymTooLong',
  firstLetter: 'settings.pseudonymFirstLetter',
  characters: 'settings.pseudonymCharacters',
}

/** Pseudonyme : règles de `profile/pseudonym` (la disponibilité se vérifie à part, côté serveur). */
export const pseudonymSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    const issue = pseudonymIssue(value)
    if (issue) context.addIssue({ code: 'custom', message: PSEUDONYM_ISSUE_KEYS[issue] })
  })

/**
 * Date de naissance (`AAAA-MM-JJ`) au jour `today` : règles de `profile/age`. Le refus pour âge (`underage`) porte sa
 * propre clé : l'écran l'affiche en page d'arrêt, pas sous le champ.
 */
export const birthDateSchema = (today: string) =>
  z.object({
    birthDate: z.string().superRefine((value, context) => {
      const issue = birthDateIssue(value, today)
      if (issue)
        context.addIssue({
          code: 'custom',
          message: issue === 'underage' ? 'tooYoung.title' : 'account.birthDateInvalid',
        })
    }),
  })
