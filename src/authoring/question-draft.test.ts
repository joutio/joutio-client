import { describe, expect, it } from 'vitest'
import type { QuestionEditorView } from './authoring.js'
import { buildQuestionPlan, draftFromQuestion, emptyDraft, toCreateInput } from './question-draft.js'

const answers = [
  { choice: 'A' as const, text: 'Paris' },
  { choice: 'B' as const, text: 'Lyon' },
  { choice: 'C' as const, text: 'Lille' },
  { choice: 'D' as const, text: 'Nice' },
]

const saved: QuestionEditorView = {
  questionId: 'q',
  contents: [{ language: 'fr', text: 'Quelle ville ?', answers, imageAlt: 'La tour Eiffel' }],
  correctAnswer: 'A',
  imageUrl: 'https://img/x.webp',
  status: 'APPROVED',
  suspended: false,
  archived: false,
  openReportCount: 0,
  totalReportCount: 0,
  lastReportedAt: null,
  createdAt: '2026-11-19T00:00:00Z',
  updatedAt: null,
}

describe('question image description', () => {
  it('is sent with the content of each language when there is an image', () => {
    const draft = { ...emptyDraft(), texts: { fr: 'Quelle ville ?', en: '' }, answers: { fr: ['Paris', 'Lyon', 'Lille', 'Nice'], en: ['', '', '', ''] }, correct: 0, imageUrl: 'https://img/x.webp', alt: { fr: ' La tour Eiffel ', en: '' } }
    expect(toCreateInput(draft).contents[0]?.imageAlt).toBe('La tour Eiffel')
    expect(toCreateInput({ ...draft, imageUrl: undefined }).contents[0]?.imageAlt).toBeNull()
  })

  it('is read back from the saved question and only sent when it changes', () => {
    const draft = draftFromQuestion(saved)
    expect(draft.alt.fr).toBe('La tour Eiffel')
    expect(buildQuestionPlan(saved, draft)).toEqual([])
    expect(buildQuestionPlan(saved, { ...draft, alt: { fr: 'Le Louvre', en: '' } })).toEqual([{ kind: 'imageAlt', language: 'fr', imageAlt: 'Le Louvre' }])
  })

  it('is cleared with the image', () => {
    const draft = { ...draftFromQuestion(saved), imageUrl: undefined }
    expect(buildQuestionPlan(saved, draft)).toEqual([
      { kind: 'imageAlt', language: 'fr', imageAlt: null },
      { kind: 'imageUrl', imageUrl: null },
    ])
  })
})
