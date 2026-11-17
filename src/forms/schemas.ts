import { z } from 'zod'
import {
  CONTENT_NOTICE_CATEGORIES,
  CONTENT_NOTICE_MIN_DESCRIPTION,
  type ContentNoticeCategory,
  type QuestionReportReason,
  type UserReportReason,
} from '../api-types/bff.js'
import { MAX_DESCRIPTION } from '../authoring/description.js'
import { MAX_NAME, MAX_REJECT } from '../authoring/limits.js'
import { isReady, type QuestionDraft } from '../authoring/question-draft.js'
import { tooLongTitle } from '../authoring/titles.js'
import { birthDateIssue } from '../profile/age.js'
import { pseudonymIssue, type PseudonymIssue } from '../profile/pseudonym.js'
import type { MessageKey } from '../i18n/translate.js'
import { MAX_BIO, MAX_NOTICE_DESCRIPTION, MAX_REPORT_COMMENT, OTP_LENGTH } from './limits.js'

/*
 * Schémas Zod des formulaires des deux apps. Un message d'erreur est une clé `@joutio/client/i18n` (`MessageKey`),
 * traduite par l'app au moment de l'afficher. Les règles viennent des modules métier (`profile`, `authoring`) : un
 * schéma ne les réécrit jamais.
 */

const key = (message: MessageKey) => ({ error: message })
const text = (max: number) => z.string().trim().max(max, key('form.tooLong'))
const required = (max: number) => text(max).min(1, key('form.required'))

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

/** Connexion par code : adresse e-mail. */
export const loginSchema = z.object({ email: z.string().trim().pipe(z.email(key('form.invalidEmail'))) })

/** Code à usage unique : exactement `OTP_LENGTH` chiffres. */
export const otpSchema = z.object({ code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), key('form.otpIncomplete')) })

/**
 * Date de naissance (`AAAA-MM-JJ`) au jour `today` : règles de `profile/age`. Le refus pour âge (`underage`) porte sa
 * propre clé : l'écran l'affiche en page d'arrêt, pas sous le champ.
 */
export const birthDateSchema = (today: string) =>
  z.object({
    birthDate: z.string().superRefine((value, context) => {
      const issue = birthDateIssue(value, today)
      if (issue) context.addIssue({ code: 'custom', message: issue === 'underage' ? 'tooYoung.title' : 'account.birthDateInvalid' })
    }),
  })

/** Édition du profil : pseudonyme, bio et pays (ISO 3166-1 alpha-2, ou aucun). */
export const profileSchema = z.object({
  pseudonym: pseudonymSchema,
  bio: text(MAX_BIO),
  country: z.string().length(2).nullable(),
})

/** Création d'un sujet : nom et univers. */
export const createTopicSchema = z.object({ name: required(MAX_NAME), category: z.string().min(1) })

/** Nom d'un sujet par langue : le français est requis, l'anglais facultatif. */
export const topicNamesSchema = z.object({ fr: required(MAX_NAME), en: text(MAX_NAME) })

/** Description d'un sujet par langue, chacune facultative. */
export const topicDescriptionsSchema = z.object({ fr: text(MAX_DESCRIPTION), en: text(MAX_DESCRIPTION) })

/** Titres personnalisés par langue et par palier (`authoring/titles`). */
export const topicTitlesSchema = z.record(z.string(), z.record(z.string(), z.string())).superRefine((draft, context) => {
  const tooLong = tooLongTitle(draft)
  if (tooLong) context.addIssue({ code: 'custom', message: 'form.tooLong', path: [tooLong.language, tooLong.tier] })
})

/** Question de l'atelier, prête à l'envoi : `isReady` de `authoring/question-draft` (image choisie ici ou non). */
export const questionDraftSchema = (imageChanged: boolean) =>
  z.custom<QuestionDraft>((draft) => isReady(draft as QuestionDraft, imageChanged), key('form.questionIncomplete'))

/** Refus motivé d'une question en modération. */
export const rejectQuestionSchema = z.object({ reason: required(MAX_REJECT) })

const reasons = <T extends string>() => z.array(z.custom<T>((value) => typeof value === 'string')).min(1, key('form.reasonRequired'))

/** Signalement d'un joueur : au moins un motif, commentaire facultatif. */
export const userReportSchema = z.object({ reasons: reasons<UserReportReason>(), comment: text(MAX_REPORT_COMMENT) })

/** Signalement d'une question : au moins un motif, commentaire facultatif. */
export const questionReportSchema = z.object({ reasons: reasons<QuestionReportReason>(), comment: text(MAX_REPORT_COMMENT) })

/** Signalement de contenu illicite (sujet) : catégorie, description motivée, déclaration de bonne foi. */
export const contentNoticeSchema = z.object({
  category: z.custom<ContentNoticeCategory>((value) => CONTENT_NOTICE_CATEGORIES.includes(value as ContentNoticeCategory), key('form.required')),
  description: text(MAX_NOTICE_DESCRIPTION).min(CONTENT_NOTICE_MIN_DESCRIPTION, key('form.tooShort')),
  goodFaith: z.boolean().refine((value) => value, key('form.required')),
})
