import type { VaultCategory } from '../../../core/vault-category'
import type { VaultItem } from '../types'

type ThemeMode = 'light' | 'dark'

interface HomePanelProps {
  notes: VaultItem[]
  onOpenSearch: () => void
  onSelectNote: (id: string) => void
  onCreateCategory: (category: VaultCategory) => void
  onOpenInsights: () => void
  onToggleTheme: () => void
  themeMode: ThemeMode
}

const QUICK_ACTIONS: Array<{
  category: VaultCategory
  label: string
  icon: string
}> = [
  { category: 'note', label: 'Note', icon: 'edit_note' },
  { category: 'document', label: 'Document', icon: 'description' },
  { category: 'password', label: 'Password', icon: 'vpn_key' },
  { category: 'card', label: 'Card', icon: 'credit_card' },
]

const CATEGORY_ICONS: Record<string, string> = {
  note: 'edit_note',
  document: 'description',
  password: 'vpn_key',
  card: 'credit_card',
}

const formatDate = (date: number) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function HomePanel({
  notes,
  onOpenSearch,
  onSelectNote,
  onCreateCategory,
  onOpenInsights,
  onToggleTheme,
  themeMode,
}: HomePanelProps) {
  return (
    <section className="sv-screen">
      {/* Header - EXACTLY 56px */}
      <header className="sv-sticky">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--accent)]">
              shield_person
            </span>
            <h1 className="sv-title">Sovereign Vault</h1>
          </div>
          <button className="sv-icon-btn" onClick={onToggleTheme}>
            <span className="material-symbols-outlined">
              {themeMode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Search Bar - 44px height */}
        <button
          className="sv-input flex items-center gap-3 text-left"
          onClick={onOpenSearch}
        >
          <span className="material-symbols-outlined text-[var(--text-secondary)]">
            search
          </span>
          <span className="text-[var(--text-secondary)]">Search vault...</span>
          <span className="material-symbols-outlined ml-auto text-[var(--accent)]">
            auto_awesome
          </span>
        </button>

        {/* Quick Actions - 72x72 each */}
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.category}
              className="sv-quick-action"
              onClick={() => onCreateCategory(action.category)}
            >
              <span className="material-symbols-outlined text-2xl text-[var(--accent)]">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="sv-section-header">
            <h2 className="sv-section">Recent</h2>
            <button className="sv-caption text-[var(--accent)]" onClick={onOpenSearch}>
              View All
            </button>
          </div>

          <div className="sv-card">
            {notes.length === 0 ? (
              <div className="p-4 text-center">
                <p className="sv-body text-[var(--text-secondary)]">
                  No notes yet. Create your first secure entry.
                </p>
              </div>
            ) : (
              notes.slice(0, 5).map((note) => (
                <button
                  key={note.id}
                  className="sv-list-item w-full text-left"
                  onClick={() => onSelectNote(note.id)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent-soft)]">
                    <span className="material-symbols-outlined text-lg text-[var(--accent)]">
                      {CATEGORY_ICONS[note.category] || 'note'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="sv-body font-medium truncate">{note.title}</p>
                    <p className="sv-caption truncate">
                      {note.content.slice(0, 50) || 'Encrypted note'}
                    </p>
                  </div>
                  <span className="sv-caption whitespace-nowrap">
                    {formatDate(note.updatedAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="sv-card p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[var(--accent)]">
              auto_awesome
            </span>
            <div className="flex-1">
              <h3 className="sv-body font-semibold">AI Insights</h3>
              <p className="sv-caption mt-1">
                Your vault has patterns waiting to be discovered.
              </p>
              <button
                className="sv-btn-primary mt-3 text-sm"
                onClick={onOpenInsights}
              >
                Review Insights
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
