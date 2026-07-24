import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  VAULT_CATEGORIES,
  getVaultCategoryLabel,
  type VaultCategory,
} from '../../core/types/category'
import { copySecureToClipboard } from '../../core/utils/clipboard'

import {
  evaluatePasswordStrength,
  generateSecurePassword,
} from '../../core/crypto/password-generator'
import type { VaultItem, VaultItemDraft } from '../../core/types/vault'

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
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<VaultCategory>('note')
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Category-specific UI states
  const [showPassword, setShowPassword] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [copyNotification, setCopyNotification] = useState<string | null>(null)

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
    setShowPassword(false)
    setIsPreviewMode(false)
  }, [note])

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

  const passwordStrength = useMemo(() => {
    if (category !== 'password') return null
    return evaluatePasswordStrength(content)
  }, [category, content])

  const wordCount = useMemo(() => {
    if (!content.trim()) return 0
    return content.trim().split(/\s+/).length
  }, [content])

  const isDirty = useMemo(() => {
    if (!note) {
      return false
    }

    return (
      note.category !== category ||
      note.title !== title ||
      note.content !== content ||
      tagsToInput(note.tags) !== tagInput
    )
  }, [category, content, note, tagInput, title])

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault()

    if (!note || !isDirty || isSaving || isDeleting) {
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

  const handleDelete = async () => {
    if (!note || isSaving || isDeleting) {
      return
    }

    const confirmed = window.confirm(`Permanently delete "${note.title}" from your encrypted vault?`)
    if (!confirmed) {
      return
    }

    setIsDeleting(true)

    try {
      await onDelete(note.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleGeneratePassword = () => {
    const newPwd = generateSecurePassword({ length: 18 })
    setContent(newPwd)
    setShowPassword(true)
  }

  const handleCopySecret = async (secretText: string, label: string) => {
    const result = await copySecureToClipboard(secretText, 30_000)
    if (result.success) {
      setCopyNotification(`${label} copied! Auto-clearing clipboard in ${result.autoClearSec}s.`)
      setTimeout(() => setCopyNotification(null), 4000)
    }
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[var(--vault-subtext)]">
        Select an item to view or edit.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--vault-bg)] px-4 py-6">
      {/* Top Action Bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--vault-subtext)] transition-colors hover:text-[var(--vault-text)]"
          onClick={onBack}
          type="button"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {summaryEnabled && onSummarize && (
            <button
              className="sv-btn-secondary py-1.5 px-3 text-xs"
              disabled={isSummarizing || isSaving}
              onClick={() => onSummarize(note)}
              type="button"
            >
              {isSummarizing ? 'Summarizing...' : 'AI Summary'}
            </button>
          )}

          <button
            className="sv-btn-primary py-1.5 px-4 text-xs disabled:opacity-50"
            disabled={!isDirty || isSaving || isDeleting}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            className="p-1.5 text-[var(--vault-subtext)] hover:text-red-400 transition-colors"
            disabled={isSaving || isDeleting}
            onClick={() => void handleDelete()}
            title="Delete Item"
            type="button"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>

      {/* Copy notification toast */}
      {copyNotification && (
        <div className="mb-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 text-xs text-indigo-300 text-center animate-fade-in">
          {copyNotification}
        </div>
      )}

      {/* Metadata Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-[var(--vault-subtext)]">
        <span className="rounded-md bg-[var(--vault-card-bg)] px-2 py-0.5 font-medium uppercase tracking-wider text-[var(--vault-accent)]">
          {getVaultCategoryLabel(category)}
        </span>
        <span>•</span>
        <span>Updated {detailDateFormatter.format(note.updatedAt)}</span>
        {(category === 'note' || category === 'document') && (
          <>
            <span>•</span>
            <span>{wordCount} words ({content.length} chars)</span>
          </>
        )}
      </div>

      {/* Title & Category Selector */}
      <div className="mb-4 space-y-3">
        <input
          className="w-full bg-transparent text-xl font-bold text-[var(--vault-text)] placeholder-[var(--vault-subtext)] outline-none"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item Title..."
          type="text"
          value={title}
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {VAULT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-[var(--vault-accent)] text-white shadow-md'
                  : 'bg-[var(--vault-card-bg)] text-[var(--vault-subtext)] hover:text-[var(--vault-text)]'
              }`}
              onClick={() => setCategory(cat)}
              type="button"
            >
              {getVaultCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Category-Specific Production Interfaces */}
      {category === 'password' ? (
        <div className="mb-4 space-y-4 sv-card p-4">
          <div className="flex items-center justify-between border-b border-[var(--vault-border)] pb-2">
            <span className="text-xs font-semibold text-[var(--vault-text)]">Password Credential</span>
            <button
              className="text-xs text-[var(--vault-accent)] font-medium hover:underline"
              onClick={handleGeneratePassword}
              type="button"
            >
              Generate Strong Password
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--vault-subtext)]">
              Password Secret / Token
            </label>
            <div className="relative flex items-center">
              <input
                className="w-full rounded-lg bg-[var(--vault-bg)] border border-[var(--vault-border)] px-3 py-2.5 pr-20 text-sm font-mono text-[var(--vault-text)] outline-none focus:border-[var(--vault-accent)]"
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter password..."
                type={showPassword ? 'text' : 'password'}
                value={content}
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  className="p-1 text-[var(--vault-subtext)] hover:text-[var(--vault-text)]"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  className="p-1 text-[var(--vault-accent)] hover:opacity-80"
                  onClick={() => void handleCopySecret(content, 'Password')}
                  title="Copy password to clipboard"
                  type="button"
                >
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                </button>
              </div>
            </div>
          </div>

          {passwordStrength && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--vault-subtext)]">Security Strength</span>
                <span className="font-semibold" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--vault-bg)] overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : category === 'card' ? (
        <div className="mb-4 space-y-4 sv-card p-4">
          <div className="flex items-center justify-between border-b border-[var(--vault-border)] pb-2">
            <span className="text-xs font-semibold text-[var(--vault-text)]">Payment Card Details</span>
            <span className="material-symbols-outlined text-xl text-[var(--vault-accent)]">credit_card</span>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--vault-subtext)]">
              Cardholder & Number Data
            </label>
            <div className="relative flex items-center">
              <textarea
                className="w-full rounded-lg bg-[var(--vault-bg)] border border-[var(--vault-border)] p-3 text-sm font-mono text-[var(--vault-text)] outline-none focus:border-[var(--vault-accent)]"
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cardholder Name, Number, Expiry, CVV..."
                rows={3}
                value={content}
              />
              <button
                className="absolute right-2 top-2 p-1 text-[var(--vault-accent)] hover:opacity-80"
                onClick={() => void handleCopySecret(content, 'Card Details')}
                title="Copy Card details"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          <div className="flex justify-end gap-2">
            <button
              className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                !isPreviewMode ? 'bg-[var(--vault-card-bg)] text-[var(--vault-text)]' : 'text-[var(--vault-subtext)]'
              }`}
              onClick={() => setIsPreviewMode(false)}
              type="button"
            >
              Write
            </button>
            <button
              className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                isPreviewMode ? 'bg-[var(--vault-card-bg)] text-[var(--vault-text)]' : 'text-[var(--vault-subtext)]'
              }`}
              onClick={() => setIsPreviewMode(true)}
              type="button"
            >
              Preview
            </button>
          </div>

          {!isPreviewMode ? (
            <textarea
              className="w-full min-h-[220px] resize-y rounded-xl bg-[var(--vault-card-bg)] border border-[var(--vault-border)] p-3.5 text-sm text-[var(--vault-text)] outline-none focus:border-[var(--vault-accent)] font-sans leading-relaxed"
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write encrypted notes or thoughts..."
              value={content}
            />
          ) : (
            <div className="min-h-[220px] rounded-xl bg-[var(--vault-card-bg)] border border-[var(--vault-border)] p-3.5 text-sm text-[var(--vault-text)] whitespace-pre-wrap font-sans leading-relaxed">
              {content || <span className="text-[var(--vault-subtext)] italic">Empty entry content.</span>}
            </div>
          )}
        </div>
      )}

      {/* Tags Input */}
      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-medium text-[var(--vault-subtext)]">
          Tags (comma separated)
        </label>
        <input
          className="w-full rounded-lg bg-[var(--vault-card-bg)] border border-[var(--vault-border)] px-3 py-2 text-xs text-[var(--vault-text)] outline-none focus:border-[var(--vault-accent)]"
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="work, ideas, crypto..."
          type="text"
          value={tagInput}
        />
      </div>

      {/* AI Summary Section */}
      {summaryPoints.length > 0 && (
        <div className="sv-card p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--vault-accent)]">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            <span>AI Bullet Summary</span>
          </div>
          <ul className="space-y-1 pl-4 text-xs text-[var(--vault-subtext)] list-disc">
            {summaryPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
