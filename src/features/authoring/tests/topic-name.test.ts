import { describe, expect, it } from 'vitest'
import { sameNameTopic, topicNameKey } from '../domain/topic-name.js'

describe('topic names', () => {
  it('compares names without accents, case or extra spaces', () => {
    expect(topicNameKey('  Châteaux   de la LOIRE ')).toBe('chateaux de la loire')
  })

  it('finds a topic with the same name in any language, never a partial match', () => {
    const topics = [
      { topicId: 't1', names: { fr: 'Harry Potter 2' } },
      { topicId: 't2', names: { fr: 'Capitales', en: 'Capitals' } },
    ]
    expect(sameNameTopic('capitals', topics)?.topicId).toBe('t2')
    expect(sameNameTopic('Harry Potter', topics)).toBeUndefined()
    expect(sameNameTopic('   ', topics)).toBeUndefined()
  })
})
