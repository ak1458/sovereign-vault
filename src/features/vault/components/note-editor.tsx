import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'
import {
  VAULT_CATEGORIES,
  getVaultCategoryLabel,
  type VaultCategory,
} from '../../../core/vault-category'
import type { VaultItem, VaultItemDraft } from '../types'

const detailDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface NoteEditorProps {
  note: VaultItem | null
  onBack?: () => void
  summaryEnabled?: boolean
  summaryText?: string
  isSummarizing?: boolean
  onDelete: (id: string) => Promise<void>
  onSave: (id: string, draft: VaultItemDraft) => Promise<void>
  onSummarize?: (note: VaultItem) => Promise<void>
}

const tagsToInput = (tags: string[]): string => tags.join(', ')

const inputToTags = (value: string): string[] => {
  const uniqueTags = new Set<string>()

  for (const rawTag of value.split(',')) {
    const tag = rawTag.trim()

    if (tag.length > 0) {
      uniqueTags.add(tag)
    }
  }

  return [...uniqueTags]
}

export function NoteEditor({
  note,
  onBack,
  summaryEnabled = false,
  summaryText,
  isSummarizing = false,
  onDelete,
  onSave,
  onSummarize,
}: NoteEditorProps) {
  const summaryPoints = useMemo(() => {
    if (!summaryText) {
      return []
    }

    const segments = summaryText
      .split(/[\n.]+/g)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)

    return segments.slice(0, 4)
  }, [summaryText])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<VaultCategory>('note')
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!note) {
      setTitle('')
      setContent('')
      setCategory('note')
      setTagInput('')
      return
    }

    setCategory(note.category)
    setTitle(note.title)
    setContent(note.content)
    setTagInput(tagsToInput(note.tags))
  }, [note])

  const isDirty = useMemo(() => {
    if (!note) {
      return false
    }

    return (
      category !== note.category ||
      title !== note.title ||
      content !== note.content ||
      tagInput !== tagsToInput(note.tags)
    )
  }, [category, content, note, tagInput, title])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!note || isSaving || !isDirty) {
      return
    }

    setIsSaving(true)

    try {
      await onSave(note.id, {
        category,
        title,
        content,
        tags: inputToTags(tagInput),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (!note || isDeleting) {
      return
    }

    const shouldDelete = window.confirm('Delete this note? This cannot be undone.')
    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)

    try {
      await onDelete(note.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSummarize = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (!note || !onSummarize || isSummarizing || !summaryEnabled) {
      return
    }

    await onSummarize(note)
  }

  if (!note) {
    return (
      <section className="sv-card flex h-full min-h-[480px] items-center justify-center p-10">
        <div className="max-w-sm text-center">
          <h2 className="mb-2 text-lg font-semibold text-[var(--vault-text)]">
            No note selected
          </h2>
          <p className="text-sm text-[var(--vault-subtext)]">
            Create a note from the sidebar to start building your vault.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-[var(--vault-surface)]">
      <form className="flex h-full min-h-[480px] flex-col" onSubmit={handleSave}>
        <header className="sv-sticky px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {onBack && (
                <button
                  className="sv-icon-btn"
                  onClick={onBack}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[var(--vault-accent)]">
                    arrow_back_ios_new
                  </span>
                </button>
              )}
            </div>
            <input
              className="w-full max-w-[220px] border-none bg-transparent text-center text-lg font-bold tracking-tight text-[var(--vault-text)] outline-none"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled"
              type="text"
              value={title}
            />
            <div className="flex items-center gap-1">
              <button
                className="sv-icon-btn"
                disabled={isDeleting}
                onClick={handleDelete}
                type="button"
              >
                <span className="material-symbols-outlined text-[var(--vault-danger)]">
                  delete
                </span>
              </button>
              <button className="sv-icon-btn" disabled={!isDirty || isSaving} type="submit">
                <span className="material-symbols-outlined text-[var(--vault-accent)]">
                  save
                </span>
              </button>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-[var(--vault-subtext)]">
            Last updated {detailDateFormatter.format(note.updatedAt)}
          </div>
        </header>

        <main className="sv-screen px-5 pb-[270px] pt-4">
          <div className="sv-card mb-4 p-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="sv-input py-2 text-sm"
                onChange={(event) => setCategory(event.target.value as VaultCategory)}
                value={category}
              >
                {VAULT_CATEGORIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {getVaultCategoryLabel(entry)}
                  </option>
                ))}
              </select>
              <input
                className="sv-input py-2 text-sm"
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="tags, comma separated"
                type="text"
                value={tagInput}
              />
            </div>
          </div>

          <textarea
            className="sv-input min-h-[320px] resize-none border-none bg-transparent px-0 py-0 text-[15px] leading-7 shadow-none focus:shadow-none sm:min-h-[420px]"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your secure note here..."
            value={content}
            aria-label="Note content"
          />
        </main>

        <div className="pointer-events-none absolute bottom-[228px] left-0 right-0 h-16 bg-gradient-to-t from-[var(--vault-surface)] via-[var(--vault-surface)]/80 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--vault-border)] bg-[var(--vault-card)]">
          <div className="flex justify-center py-2">
            <div className="h-1.5 w-10 rounded-full bg-[var(--vault-border)]" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--vault-accent)]">
                auto_awesome
              </span>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--vault-text)]">
                AI Insights
              </h3>
            </div>
            {summaryEnabled && (
              <button
                className="sv-btn-secondary px-3 py-1 text-[11px]"
                disabled={isSummarizing}
                onClick={handleSummarize}
                type="button"
              >
                {isSummarizing ? 'Summarizing...' : 'Refresh'}
              </button>
            )}
          </div>

          <div className="px-5 pb-4">
            {summaryEnabled ? (
              <>
                {summaryPoints.length > 0 ? (
                  <div className="space-y-2.5">
                    {summaryPoints.map((point) => (
                      <div className="flex gap-2" key={point}>
                        <span className="material-symbols-outlined mt-0.5 text-base text-[var(--vault-accent)]/60">
                          adjust
                        </span>
                        <p className="text-xs leading-relaxed text-[var(--vault-subtext)]">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--vault-subtext)]">
                    Generate AI summary to view quick insights for this note.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--vault-subtext)]">
                Enable AI summary in Settings to generate note insights.
              </p>
            )}

            {summaryEnabled && summaryText && (
              <button
                className="sv-btn-primary mt-4 w-full py-3 text-sm"
                onClick={async (event) => {
                  event.preventDefault()
                  try {
                    await navigator.clipboard.writeText(summaryText)
                  } catch {
                    // Ignore clipboard failures in non-secure preview contexts.
                  }
                }}
                type="button"
              >
                Copy Summary
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--vault-border)] px-4 pb-4 pt-3">
            <button
              className="sv-btn-secondary py-2.5 text-sm"
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              className="sv-btn-primary py-2.5 text-sm"
              disabled={!isDirty || isSaving}
              type="submit"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
