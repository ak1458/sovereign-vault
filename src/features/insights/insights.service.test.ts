import { describe, expect, it } from 'vitest'
import type { VaultItem } from '../vault/types'
import { buildVaultInsights } from './insights.service'

const NOW = new Date('2026-02-18T12:00:00Z').getTime()

const daysAgo = (days: number): number => NOW - days * 24 * 60 * 60 * 1000

const createNote = (
  id: string,
  title: string,
  content: string,
  tags: string[],
  updatedDaysAgo: number,
  category: VaultItem['category'] = 'note',
): VaultItem => {
  return {
    id,
    category,
    title,
    content,
    tags,
    createdAt: daysAgo(updatedDaysAgo + 5),
    updatedAt: daysAgo(updatedDaysAgo),
  }
}

describe('buildVaultInsights', () => {
  it('extracts weekly topics, repeating ideas, and abandoned items', () => {
    const notes: VaultItem[] = [
      createNote('1', 'Productivity Sprint', 'Build productivity system', ['focus'], 2),
      createNote('2', 'Weekly Productivity', 'Review productivity loop', ['review'], 3),
      createNote('3', 'Productivity Plan', 'Improve productivity rituals', ['habits'], 5),
      createNote('4', 'Old Project', 'Legacy migration backlog', ['project'], 34, 'document'),
    ]

    const insights = buildVaultInsights(notes, NOW)

    expect(insights.totals.notes).toBe(4)
    expect(insights.totals.updatedThisWeek).toBe(3)
    expect(insights.totals.abandonedCount).toBe(1)
    expect(insights.abandonedProjects[0].title).toBe('Old Project')

    const weeklyTopicLabels = insights.weeklyTopics.map((topic) => topic.label)
    expect(weeklyTopicLabels).toContain('productivity')

    const repeatingLabels = insights.repeatingIdeas.map((topic) => topic.label)
    expect(repeatingLabels).toContain('productivity')
  })

  it('detects focus drift across weeks', () => {
    const notes: VaultItem[] = [
      createNote('1', 'Budget Planning', 'finance budget cashflow', ['finance'], 9),
      createNote('2', 'Revenue Ops', 'finance reporting pipeline', ['money'], 10),
      createNote('3', 'Workout Program', 'fitness gym strength', ['health'], 1),
      createNote('4', 'Cardio Plan', 'fitness cardio endurance', ['training'], 2),
    ]

    const insights = buildVaultInsights(notes, NOW)

    expect(insights.focusDrift.status).toBe('drifting')
    expect(insights.focusDrift.currentTopics.length).toBeGreaterThan(0)
    expect(insights.focusDrift.previousTopics.length).toBeGreaterThan(0)
  })

  it('marks drift as insufficient with single-week data', () => {
    const notes: VaultItem[] = [
      createNote('1', 'One Week Only', 'single period', ['solo'], 2),
    ]

    const insights = buildVaultInsights(notes, NOW)

    expect(insights.focusDrift.status).toBe('insufficient')
  })
})
