import { useEffect, useState } from 'react'
import type { VaultCategory } from '../../../core/types/category'
import { useDebouncedValue } from '../../../core/utils/use-debounced-value'
import { aiService } from '../../ai/ai.service'
import type { AiSettings } from '../../ai/ai-settings'
import type { VaultItem } from '../../../core/types/vault'
import {
  listVaultItems,
  listVaultItemsCount,
  rebuildVaultEmbeddings,
  searchVaultItemIdsByEmbedding,
} from '../vault.service'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 220

const filterByText = (notes: VaultItem[], query: string): VaultItem[] => {
  const normalized = query.trim().toLowerCase()

  if (normalized.length === 0) {
    return notes
  }

  return notes.filter((note) => {
    return (
      note.category.toLowerCase().includes(normalized) ||
      note.title.toLowerCase().includes(normalized) ||
      note.content.toLowerCase().includes(normalized) ||
      note.tags.some((tag) => tag.toLowerCase().includes(normalized))
    )
  })
}

const filterByCategory = (
  notes: VaultItem[],
  category: VaultCategory | 'all',
): VaultItem[] => {
  if (category === 'all') {
    return notes
  }

  return notes.filter((note) => note.category === category)
}

interface UseVaultNotesOptions {
  isUnlocked: boolean
  sessionKey: CryptoKey | null
  latestItemToken: string
  aiSettings: AiSettings
}

export function useVaultNotes({
  isUnlocked,
  sessionKey,
  latestItemToken,
  aiSettings,
}: UseVaultNotesOptions) {
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState<VaultCategory | 'all'>('all')
  const [page, setPage] = useState(1)
  const [filteredTotalCount, setFilteredTotalCount] = useState(0)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [visibleNotes, setVisibleNotes] = useState<VaultItem[]>([])
  const [recentNotes, setRecentNotes] = useState<VaultItem[]>([])
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const searchQuery = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)

  // Embedding background reindex
  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      return
    }

    let isCancelled = false

    const runReindex = async () => {
      try {
        await rebuildVaultEmbeddings(sessionKey, (text) => aiService.embedText(text))
      } catch {
        if (!isCancelled) {
          setVaultError('Embedding reindex encountered an issue in this session.')
        }
      }
    }

    void runReindex()

    return () => {
      isCancelled = true
    }
  }, [isUnlocked, latestItemToken, sessionKey])

  // Primary note listing & search
  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      setVisibleNotes([])
      setFilteredTotalCount(0)
      setIsLoadingNotes(false)
      return
    }

    let isCancelled = false

    const loadNotes = async () => {
      setIsLoadingNotes(true)
      setVaultError(null)

      try {
        const query = searchQuery.trim()
        let notes: VaultItem[] = []
        let totalMatches = 0

        if (query.length === 0) {
          if (activeCategory === 'all') {
            notes = await listVaultItems(sessionKey, {
              limit: PAGE_SIZE * page,
              offset: 0,
            })
            totalMatches = await listVaultItemsCount()
          } else {
            const totalCount = await listVaultItemsCount()
            const allNotes = await listVaultItems(sessionKey, {
              limit: totalCount,
              offset: 0,
            })
            const filtered = filterByCategory(allNotes, activeCategory)
            totalMatches = filtered.length
            notes = filtered.slice(0, PAGE_SIZE * page)
          }
        } else if (aiSettings.semanticSearchEnabled) {
          const queryEmbedding = await aiService.embedText(query)
          const resultIds = await searchVaultItemIdsByEmbedding(queryEmbedding.vector, 500)
          const rankedNotes =
            resultIds.length > 0
              ? await listVaultItems(sessionKey, { ids: resultIds })
              : []
          const filtered = filterByCategory(rankedNotes, activeCategory)
          totalMatches = filtered.length
          notes = filtered.slice(0, PAGE_SIZE * page)
        } else {
          const totalCount = await listVaultItemsCount()
          const allNotes = await listVaultItems(sessionKey, {
            limit: totalCount,
            offset: 0,
          })
          const filteredByText = filterByText(allNotes, query)
          const filtered = filterByCategory(filteredByText, activeCategory)
          totalMatches = filtered.length
          notes = filtered.slice(0, PAGE_SIZE * page)
        }

        if (!isCancelled) {
          setVisibleNotes(notes)
          setFilteredTotalCount(totalMatches)
        }
      } catch (error) {
        if (!isCancelled) {
          setVisibleNotes([])
          setFilteredTotalCount(0)
          setVaultError(
            error instanceof Error ? error.message : 'Failed to load vault notes.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingNotes(false)
        }
      }
    }

    void loadNotes()

    return () => {
      isCancelled = true
    }
  }, [
    aiSettings.semanticSearchEnabled,
    activeCategory,
    isUnlocked,
    latestItemToken,
    page,
    searchQuery,
    sessionKey,
  ])

  // Recent notes for home panel
  useEffect(() => {
    if (!isUnlocked || !sessionKey) {
      setRecentNotes([])
      return
    }

    let isCancelled = false

    const loadRecentNotes = async () => {
      try {
        const notes = await listVaultItems(sessionKey, { limit: 6, offset: 0 })
        if (!isCancelled) {
          setRecentNotes(notes)
        }
      } catch (error) {
        if (!isCancelled) {
          setRecentNotes([])
          setVaultError(
            error instanceof Error ? error.message : 'Failed to load recent notes.',
          )
        }
      }
    }

    void loadRecentNotes()

    return () => {
      isCancelled = true
    }
  }, [isUnlocked, latestItemToken, sessionKey])

  return {
    activeCategory,
    filteredTotalCount,
    isDetailOpen,
    isLoadingNotes,
    page,
    recentNotes,
    searchInput,
    selectedId,
    vaultError,
    visibleNotes,
    setActiveCategory,
    setIsDetailOpen,
    setPage,
    setSearchInput,
    setSelectedId,
    setVaultError,
  }
}
