import { z } from 'zod'
import type { MessageKey } from '../../../i18n/translate.js'
import { MAX_BIO, pseudonymSchema } from '../../profile/schema/profile.schema.js'

/** Code à usage unique reçu par e-mail (connexion, suppression du compte) : chiffres, longueur fixe. */
export const OTP_LENGTH = 6
/** Délai avant de pouvoir redemander un code. */
export const OTP_RESEND_SECONDS = 60

const key = (message: MessageKey) => ({ error: message })
const text = (max: number) => z.string().trim().max(max, key('form.tooLong'))

/** Connexion par code : adresse e-mail. */
export const loginSchema = z.object({ email: z.string().trim().pipe(z.email(key('form.invalidEmail'))) })

/** Code à usage unique : exactement `OTP_LENGTH` chiffres. */
export const otpSchema = z.object({ code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), key('form.otpIncomplete')) })

/** Édition du profil : pseudonyme, bio et pays (ISO 3166-1 alpha-2, ou aucun). */
export const profileSchema = z.object({
  pseudonym: pseudonymSchema,
  bio: text(MAX_BIO),
  country: z.string().length(2).nullable(),
})
