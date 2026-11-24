// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, fakeHttp, renderWithJoutio } from '../../../testing/joutio.js'
import { useCreateTopic, useModerateQuestion, useSaveQuestion } from '../hooks/use-authoring-mutations.js'
import { authoringKeys } from '../query/keys.js'
import type { QuestionEditorView } from '../types.js'

const question = (questionId: string, status: QuestionEditorView['status']) =>
  ({ questionId, status, contents: [], openReportCount: 0 }) as unknown as QuestionEditorView
const page = (content: unknown[]) =>
  ({ content, page: 0, size: 100, totalElements: content.length, totalPages: 1, first: true, last: true }) as never

describe('authoring mutations', () => {
  it('creating a topic shows a draft at once, then swaps in the server id', async () => {
    const pending = deferred<{ id: string }>()
    const { result, client } = renderWithJoutio(() => useCreateTopic(), {
      http: fakeHttp({ post: () => pending.promise }),
    })
    client.setQueryData(authoringKeys.contributed(), page([]))

    act(() => result.current.mutate({ name: 'Rois de France', category: 'HISTOIRE' }))
    await waitFor(() =>
      expect(client.getQueryData(authoringKeys.contributed())?.content[0]?.topicId).toMatch(/^pending-/),
    )
    await act(async () => pending.resolve({ id: 't1' }))
    await waitFor(() => expect(client.getQueryData(authoringKeys.contributed())?.content[0]?.topicId).toBe('t1'))
    expect(client.getQueryData(authoringKeys.questions('t1'))).toEqual([])
  })

  it('approving a pending question updates the todo count and the approved count of the topic', async () => {
    const pending = deferred()
    const { result, client } = renderWithJoutio(() => useModerateQuestion('t1'), {
      http: fakeHttp({ post: () => pending.promise }),
    })
    client.setQueryData(authoringKeys.questions('t1'), [question('q1', 'PENDING'), question('q2', 'APPROVED')])
    client.setQueryData(authoringKeys.todo(), [{ topicId: 't1', pending: 1, reportedQuestions: 0, suspended: 0 }])
    client.setQueryData(authoringKeys.contributed(), page([{ topicId: 't1', questionsCount: 1, status: 'DRAFT' }]))

    act(() => result.current.mutate({ questionId: 'q1', decision: 'approve' }))
    await waitFor(() => expect(client.getQueryData(authoringKeys.questions('t1'))?.[0]?.status).toBe('APPROVED'))
    expect(client.getQueryData(authoringKeys.todo())?.[0]?.pending).toBe(0)
    expect(client.getQueryData(authoringKeys.contributed())?.content[0]?.questionsCount).toBe(2)

    await act(async () => pending.reject(new Error('refused')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(authoringKeys.questions('t1'))?.[0]?.status).toBe('PENDING')
    expect(client.getQueryData(authoringKeys.todo())?.[0]?.pending).toBe(1)
    expect(client.getQueryData(authoringKeys.contributed())?.content[0]?.questionsCount).toBe(1)
  })

  it('saving a question with its reports brings them back when they stay open', async () => {
    const http = fakeHttp({
      put: () => undefined,
      post: (path) => (path.endsWith('/reports/resolve') ? Promise.reject(new Error('busy')) : undefined),
    })
    const { result, client } = renderWithJoutio(() => useSaveQuestion('t1'), { http })
    client.setQueryData(authoringKeys.questions('t1'), [{ ...question('q1', 'APPROVED'), openReportCount: 2 }])
    client.setQueryData(authoringKeys.reports('t1'), [
      { question: question('q1', 'APPROVED'), reports: [], history: null },
    ])

    act(() =>
      result.current.mutate({
        questionId: 'q1',
        operations: [{ kind: 'correctAnswer', correctAnswer: 'B' }],
        resolveReports: true,
      }),
    )
    await waitFor(() => expect(result.current.data).toEqual({ id: 'q1', reportsResolved: false }))
    expect(client.getQueryData(authoringKeys.reports('t1'))).toHaveLength(1)
    expect(client.getQueryData(authoringKeys.questions('t1'))?.[0]).toMatchObject({
      correctAnswer: 'B',
      openReportCount: 2,
    })
  })
})
