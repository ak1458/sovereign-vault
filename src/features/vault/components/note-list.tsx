import { useMemo } from 'react'
import {
  VAULT_CATEGORIES,
  getVaultCategoryLabel,
  type VaultCategory,
} from '../../../core/vault-category'
import type { VaultItem } from '../types'

const noteDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

interface NoteListProps {
  notes: VaultItem[]
  searchQuery: string
  selectedId: string | null
  activeCategory: VaultCategory | 'all'
  canCreate?: boolean
  hasMore?: boolean
  isLoading?: boolean
  onCreate: () => void
  onCreateByCategory?: (category: VaultCategory) => void
  onCategoryChange: (category: VaultCategory | 'all') => void
  onLoadMore?: () => void
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
  semanticSearchEnabled?: boolean
}

const CATEGORY_ICONS: Record<VaultCategory, string> = {
  note: 'edit_note',
  document: 'description',
  password: 'vpn_key',
  card: 'credit_card',
}

const filterLabel = (category: VaultCategory | 'all'): string => {
  if (category === 'all') return 'All'
  return getVaultCategoryLabel(category)
}

export function NoteList(props: NoteListProps) {
  const {
    notes,
    searchQuery,
    selectedId,
    activeCategory,
    hasMore = false,
    isLoading = false,
    onCategoryChange,
    onLoadMore,
    onSearchChange,
    onSelect,
    semanticSearchEnabled = false,
  } = props
  const filteredChips = useMemo(() => {
    return ['all' as const, ...VAULT_CATEGORIES]
  }, [])

  return (
    <section className="sv-screen">
      {/* Header - EXACTLY 56px */}
      <header className="sv-sticky">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--accent)]">
              search
            </span>
            <h1 className="sv-title">Search</h1>
          </div>
          <button
            className="sv-caption text-[var(--accent)] font-medium"
            onClick={() => onSearchChange('')}
          >
            Clear
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Search Input - Sticky below header */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
            search
          </span>
          <input
            className="sv-input pl-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your vault..."
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => onSearchChange('')}
            >
              <span className="material-symbols-outlined text-[var(--text-secondary)]">
                close
              </span>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {filteredChips.map((category) => (
            <button
              key={category}
              className={`sv-chip ${activeCategory === category ? 'sv-chip-active' : ''}`}
              onClick={() => onCategoryChange(category)}
            >
              {filterLabel(category)}
            </button>
          ))}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <h2 className="sv-section">
            {searchQuery.trim() ? 'Results' : 'Recent Items'}
          </h2>
          <span className="sv-pill sv-pill-accent">
            {notes.length} items
          </span>
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="sv-body text-[var(--text-secondary)]">Searching...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="sv-card p-8 text-center">
            <p className="sv-body text-[var(--text-secondary)]">
              {searchQuery.trim()
                ? 'No results found. Try different keywords.'
                : 'No notes yet. Create your first secure entry.'}
            </p>
          </div>
        ) : (
          <div className="sv-card">
            {notes.map((note) => (
              <button
                key={note.id}
                className={`sv-list-item w-full text-left ${
                  selectedId === note.id ? 'bg-[var(--accent-soft)]' : ''
                }`}
                onClick={() => onSelect(note.id)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-soft)]">
                  <span className="material-symbols-outlined text-lg text-[var(--accent)]">
                    {CATEGORY_ICONS[note.category]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="sv-body font-medium truncate">{note.title}</p>
                    {semanticSearchEnabled && searchQuery && (
                      <span className="sv-pill sv-pill-accent text-[10px]">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="sv-caption truncate">
                    {note.content.slice(0, 60) || 'Encrypted note'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="sv-caption">
                    {noteDateFormatter.format(note.updatedAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && onLoadMore && (
          <button
            className="w-full sv-btn-ghost py-3 border border-[var(--border)] rounded-xl"
            onClick={onLoadMore}
          >
            Load More
          </button>
        )}
      </div>
    </section>
  )
}
