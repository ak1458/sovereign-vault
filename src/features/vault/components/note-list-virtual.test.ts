import { describe, expect, it } from 'vitest'
import { computeVirtualWindow } from './note-list-virtual'

describe('note list virtualization window', () => {
  it('returns empty window for zero items', () => {
    const result = computeVirtualWindow({
      itemCount: 0,
      itemHeight: 100,
      viewportHeight: 300,
      scrollTop: 0,
      overscan: 2,
    })

    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(0)
    expect(result.totalHeight).toBe(0)
  })

  it('computes start and end around visible range', () => {
    const result = computeVirtualWindow({
      itemCount: 1000,
      itemHeight: 120,
      viewportHeight: 480,
      scrollTop: 1200,
      overscan: 3,
    })

    expect(result.startIndex).toBe(7)
    expect(result.endIndex).toBe(17)
    expect(result.totalHeight).toBe(120000)
  })

  it('clamps range at list end', () => {
    const result = computeVirtualWindow({
      itemCount: 10,
      itemHeight: 100,
      viewportHeight: 400,
      scrollTop: 2000,
      overscan: 4,
    })

    expect(result.startIndex).toBe(10)
    expect(result.endIndex).toBe(10)
  })
})
