import { describe, expect, it } from 'vitest'
import { cosineSimilarity, createHashEmbedding } from './vector'

describe('ai vector', () => {
  it('creates deterministic embeddings for same text', () => {
    const first = createHashEmbedding('secure vault note text')
    const second = createHashEmbedding('secure vault note text')

    expect(first).toEqual(second)
  })

  it('scores similar text higher than unrelated text', () => {
    const anchor = createHashEmbedding('privacy focused encrypted vault notes')
    const similar = createHashEmbedding('encrypted private notes in vault')
    const unrelated = createHashEmbedding('football scoreboard and weather report')

    const similarScore = cosineSimilarity(anchor, similar)
    const unrelatedScore = cosineSimilarity(anchor, unrelated)

    expect(similarScore).toBeGreaterThan(unrelatedScore)
  })
})
