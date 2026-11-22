import { describe, expect, it } from 'vitest'
import { emptyDraft } from '../domain/question-draft.js'
import { loginSchema, otpSchema, profileSchema } from '../../me/schema/me.schema.js'
import { birthDateSchema } from '../../profile/schema/profile.schema.js'
import {
  contentNoticeSchema,
  createTopicSchema,
  questionDraftSchema,
  rejectQuestionSchema,
  topicTitlesSchema,
  userReportSchema,
} from './authoring.schema.js'

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) => result.error?.issues.map((issue) => issue.message) ?? []

describe('form schemas', () => {
  it('validates the login e-mail and trims it', () => {
    expect(loginSchema.parse({ email: '  nadia@exemple.fr ' })).toEqual({ email: 'nadia@exemple.fr' })
    expect(messages(loginSchema.safeParse({ email: 'nadia' }))).toEqual(['form.invalidEmail'])
  })

  it('requires the 6 digits of the code', () => {
    expect(otpSchema.safeParse({ code: '123456' }).success).toBe(true)
    expect(messages(otpSchema.safeParse({ code: '12a45' }))).toEqual(['form.otpIncomplete'])
  })

  it('applies the birth date rules of profile/age', () => {
    const schema = birthDateSchema('2026-11-17')
    expect(schema.safeParse({ birthDate: '2000-05-01' }).success).toBe(true)
    expect(messages(schema.safeParse({ birthDate: '2015-05-01' }))).toEqual(['tooYoung.title'])
    expect(messages(schema.safeParse({ birthDate: '2030-01-01' }))).toEqual(['account.birthDateInvalid'])
  })

  it('reuses the pseudonym rules and bounds the bio', () => {
    expect(profileSchema.safeParse({ pseudonym: 'Nadia_42', bio: '', country: 'FR' }).success).toBe(true)
    expect(messages(profileSchema.safeParse({ pseudonym: '4me', bio: '', country: null }))).toEqual(['settings.pseudonymFirstLetter'])
    expect(messages(profileSchema.safeParse({ pseudonym: 'Nadia', bio: 'x'.repeat(161), country: null }))).toEqual(['form.tooLong'])
  })

  it('requires a topic name and a reject reason', () => {
    expect(messages(createTopicSchema.safeParse({ name: '   ', category: 'GENERAL' }))).toEqual(['form.required'])
    expect(messages(rejectQuestionSchema.safeParse({ reason: '' }))).toEqual(['form.required'])
  })

  it('flags the first title that is too long', () => {
    const result = topicTitlesSchema.safeParse({ fr: { OR: 'x'.repeat(41) }, en: {} })
    expect(result.error?.issues[0]?.path).toEqual(['fr', 'OR'])
  })

  it('accepts a question only when ready', () => {
    expect(messages(questionDraftSchema().safeParse(emptyDraft()))).toEqual(['form.questionIncomplete'])
    const ready = { ...emptyDraft(), texts: { fr: 'Capitale de la France ?', en: '' }, answers: { fr: ['Paris', 'Lyon', 'Nice', 'Lille'], en: ['', '', '', ''] }, correct: 0 }
    expect(questionDraftSchema().safeParse(ready).success).toBe(true)
    // Image choisie ici : sa description est exigée ; l'image déjà enregistrée n'en a pas besoin.
    const withImage = { ...ready, imageUrl: 'https://media/new.jpg' }
    expect(questionDraftSchema().safeParse(withImage).success).toBe(false)
    expect(questionDraftSchema('https://media/new.jpg').safeParse(withImage).success).toBe(true)
  })

  it('needs a report reason, and a motivated, good-faith content notice', () => {
    expect(messages(userReportSchema.safeParse({ reasons: [], comment: '' }))).toEqual(['form.reasonRequired'])
    expect(contentNoticeSchema.safeParse({ category: 'COPYRIGHT', description: 'Image reprise sans autorisation.', goodFaith: true }).success).toBe(true)
    expect(messages(contentNoticeSchema.safeParse({ category: 'COPYRIGHT', description: 'trop court', goodFaith: false }))).toEqual(['form.tooShort', 'form.required'])
  })
})
