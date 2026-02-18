import { getVaultCategoryLabel } from '../../core/vault-category'
import type { VaultCategory } from '../../core/vault-category'
import type { VaultItem } from '../vault/types'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_DAYS = 7
const ABANDONED_THRESHOLD_DAYS = 21
const REPEATING_IDEA_MIN_NOTES = 3
const TOPIC_LIMIT = 5

const STOP_WORDS = new Set([
  'a',
  'about',
  'after',
  'all',
  'also',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'before',
  'but',
  'by',
  'for',
  'from',
  'had',
  'has',
  'have',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'more',
  'new',
  'no',
  'not',
  'of',
  'on',
  'or',
  'our',
  'out',
  'over',
  'so',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'this',
  'to',
  'up',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'with',
  'you',
  'your',
])

export interface InsightTopic {
  label: string
  count: number
}

export interface AbandonedItem {
  id: string
  title: string
  category: VaultCategory
  daysIdle: number
}

export interface FocusDriftInsight {
  status: 'stable' | 'drifting' | 'insufficient'
  summary: string
  overlapRatio: number
  currentTopics: string[]
  previousTopics: string[]
}

export interface VaultInsights {
  generatedAt: number
  totals: {
    notes: number
    updatedThisWeek: number
    abandonedCount: number
  }
  weeklyTopics: InsightTopic[]
  repeatingIdeas: InsightTopic[]
  abandonedProjects: AbandonedItem[]
  focusDrift: FocusDriftInsight
}

const toTerms = (note: VaultItem): string[] => {
  const source = [note.title, note.tags.join(' '), note.content].join(' ')

  return source
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((term) => term.trim())
    .filter(
      (term) =>
        term.length >= 3 &&
        !STOP_WORDS.has(term) &&
        !/^\d+$/.test(term),
    )
}

const buildTermCounts = (notes: VaultItem[]): Map<string, number> => {
  const counts = new Map<string, number>()

  for (const note of notes) {
    const uniqueTerms = new Set(toTerms(note))

    for (const term of uniqueTerms) {
      counts.set(term, (counts.get(term) ?? 0) + 1)
    }
  }

  return counts
}

const toTopTopics = (counts: Map<string, number>, limit = TOPIC_LIMIT): InsightTopic[] => {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

const dominantCategory = (notes: VaultItem[]): VaultCategory | null => {
  if (notes.length === 0) {
    return null
  }

  const counts = new Map<VaultCategory, number>()

  for (const note of notes) {
    counts.set(note.category, (counts.get(note.category) ?? 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

const buildFocusDriftInsight = (
  notes: VaultItem[],
  now: number,
): FocusDriftInsight => {
  const currentStart = now - WEEK_DAYS * DAY_MS
  const previousStart = now - WEEK_DAYS * 2 * DAY_MS

  const currentWeek = notes.filter((note) => note.updatedAt >= currentStart)
  const previousWeek = notes.filter(
    (note) => note.updatedAt >= previousStart && note.updatedAt < currentStart,
  )

  if (currentWeek.length === 0 || previousWeek.length === 0) {
    return {
      status: 'insufficient',
      summary: 'Need activity across two weeks to measure focus drift.',
      overlapRatio: 0,
      currentTopics: [],
      previousTopics: [],
    }
  }

  const currentTopics = toTopTopics(buildTermCounts(currentWeek), TOPIC_LIMIT).map(
    (topic) => topic.label,
  )
  const previousTopics = toTopTopics(
    buildTermCounts(previousWeek),
    TOPIC_LIMIT,
  ).map((topic) => topic.label)

  const previousSet = new Set(previousTopics)
  const overlapCount = currentTopics.filter((topic) =>
    previousSet.has(topic),
  ).length
  const overlapRatio =
    currentTopics.length > 0 ? overlapCount / currentTopics.length : 0

  const currentCategory = dominantCategory(currentWeek)
  const previousCategory = dominantCategory(previousWeek)

  if (overlapRatio < 0.35) {
    const categoryShift =
      currentCategory && previousCategory && currentCategory !== previousCategory
        ? ` Focus moved from ${getVaultCategoryLabel(previousCategory)} to ${getVaultCategoryLabel(currentCategory)}.`
        : ''

    return {
      status: 'drifting',
      summary: `Attention topics changed strongly versus last week.${categoryShift}`,
      overlapRatio,
      currentTopics,
      previousTopics,
    }
  }

  return {
    status: 'stable',
    summary: 'Focus themes are consistent with last week.',
    overlapRatio,
    currentTopics,
    previousTopics,
  }
}

export const buildVaultInsights = (
  notes: VaultItem[],
  now = Date.now(),
): VaultInsights => {
  const weekStart = now - WEEK_DAYS * DAY_MS
  const weekNotes = notes.filter((note) => note.updatedAt >= weekStart)
  const weeklyTopics = toTopTopics(buildTermCounts(weekNotes))

  const repeatingIdeas = toTopTopics(buildTermCounts(notes)).filter(
    (topic) => topic.count >= REPEATING_IDEA_MIN_NOTES,
  )

  const abandonedProjects = notes
    .map((note) => ({
      ...note,
      daysIdle: Math.floor((now - note.updatedAt) / DAY_MS),
    }))
    .filter((note) => note.daysIdle >= ABANDONED_THRESHOLD_DAYS)
    .sort((a, b) => b.daysIdle - a.daysIdle)
    .slice(0, 5)
    .map((note) => ({
      id: note.id,
      title: note.title,
      category: note.category,
      daysIdle: note.daysIdle,
    }))

  return {
    generatedAt: now,
    totals: {
      notes: notes.length,
      updatedThisWeek: weekNotes.length,
      abandonedCount: abandonedProjects.length,
    },
    weeklyTopics,
    repeatingIdeas,
    abandonedProjects,
    focusDrift: buildFocusDriftInsight(notes, now),
  }
}
