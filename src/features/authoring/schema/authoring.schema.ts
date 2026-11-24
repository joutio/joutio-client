import { z } from 'zod'
import type { MessageKey } from '../../../core/i18n/translate.js'
import { MAX_DESCRIPTION } from '../domain/description.js'
import { MAX_NAME, MAX_REJECT } from '../domain/limits.js'
import { isReady, type QuestionDraft } from '../domain/question-draft.js'
import { tooLongTitle } from '../domain/titles.js'
import {
  CONTENT_NOTICE_CATEGORIES,
  CONTENT_NOTICE_MIN_DESCRIPTION,
  type ContentNoticeCategory,
  type QuestionReportReason,
  type UserReportReason,
} from '../types.js'

/** Commentaire d'un signalement de joueur ou de question (miroir du BFF, `*ReportRules.MAX_COMMENT_LENGTH`). */
export const MAX_REPORT_COMMENT = 500
/** Description d'un signalement de contenu illicite (miroir du BFF, `ContentNoticeRequest`). */
export const MAX_NOTICE_DESCRIPTION = 4000

const key = (message: MessageKey) => ({ error: message })
const text = (max: number) => z.string().trim().max(max, key('form.tooLong'))
const required = (max: number) => text(max).min(1, key('form.required'))

/** Création d'un sujet : nom et univers. */
export const createTopicSchema = z.object({ name: required(MAX_NAME), category: z.string().min(1) })

/** Nom d'un sujet par langue : le français est requis, l'anglais facultatif. */
export const topicNamesSchema = z.object({ fr: required(MAX_NAME), en: text(MAX_NAME) })

/** Description d'un sujet par langue, chacune facultative. */
export const topicDescriptionsSchema = z.object({ fr: text(MAX_DESCRIPTION), en: text(MAX_DESCRIPTION) })

/** Titres personnalisés par langue et par palier (`authoring/titles`). */
export const topicTitlesSchema = z
  .record(z.string(), z.record(z.string(), z.string()))
  .superRefine((draft, context) => {
    const tooLong = tooLongTitle(draft)
    if (tooLong) context.addIssue({ code: 'custom', message: 'form.tooLong', path: [tooLong.language, tooLong.tier] })
  })

/**
 * Question de l'atelier, prête à l'envoi : `isReady` de `authoring/question-draft`. L'image est « choisie dans cet
 * éditeur » quand son URL diffère de celle enregistrée (`savedImageUrl`, absente pour une nouvelle question).
 */
export const questionDraftSchema = (savedImageUrl?: string) =>
  z.custom<QuestionDraft>((value) => {
    const draft = value as QuestionDraft
    return isReady(draft, draft.imageUrl !== savedImageUrl)
  }, key('form.questionIncomplete'))

/** Refus motivé d'une question en modération. */
export const rejectQuestionSchema = z.object({ reason: required(MAX_REJECT) })

const reasons = <T extends string>() =>
  z.array(z.custom<T>((value) => typeof value === 'string')).min(1, key('form.reasonRequired'))

/** Signalement d'un joueur : au moins un motif, commentaire facultatif. */
export const userReportSchema = z.object({ reasons: reasons<UserReportReason>(), comment: text(MAX_REPORT_COMMENT) })

/** Signalement d'une question : au moins un motif, commentaire facultatif. */
export const questionReportSchema = z.object({
  reasons: reasons<QuestionReportReason>(),
  comment: text(MAX_REPORT_COMMENT),
})

/** Signalement de contenu illicite (sujet) : catégorie, description motivée, déclaration de bonne foi. */
export const contentNoticeSchema = z.object({
  category: z.custom<ContentNoticeCategory>(
    (value) => CONTENT_NOTICE_CATEGORIES.includes(value as ContentNoticeCategory),
    key('form.required'),
  ),
  description: text(MAX_NOTICE_DESCRIPTION).min(CONTENT_NOTICE_MIN_DESCRIPTION, key('form.tooShort')),
  goodFaith: z.boolean().refine((value) => value, key('form.required')),
})
