import { useState } from 'react'
import { aiService } from '../ai.service'
import type { AiSettings } from '../ai-settings'
import type { VaultItem } from '../../vault/types'

interface AiPanelProps {
  settings: AiSettings
  selectedNote: VaultItem | null
  onChangeSettings: (settings: AiSettings) => void
}

export function AiPanel({
  settings,
  selectedNote,
  onChangeSettings,
}: AiPanelProps) {
  const [summary, setSummary] = useState<string>('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleSemantic = () => {
    onChangeSettings({
      ...settings,
      semanticSearchEnabled: !settings.semanticSearchEnabled,
    })
  }

  const handleToggleSummary = () => {
    onChangeSettings({
      ...settings,
      summaryEnabled: !settings.summaryEnabled,
    })
  }

  const handleSummarize = async () => {
    if (!selectedNote || isSummarizing || !settings.summaryEnabled) {
      return
    }

    setError(null)
    setSummary('')
    setIsSummarizing(true)

    try {
      const result = await aiService.summarizeText(selectedNote.content, 3)
      setSummary(result.summary || 'No summary could be generated.')
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Summary generation failed.',
      )
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <section className="glass-card flex h-full flex-col p-4">
      <h2 className="text-lg font-semibold tracking-tight text-sv-text">AI Controls</h2>
      <p className="mt-2 text-sm text-sv-subtext">
        Configure local AI behavior for semantic search and optional summaries.
      </p>

      <div className="mt-4 space-y-2">
        <button
          className="secondary-button w-full justify-center text-center"
          onClick={handleToggleSemantic}
          type="button"
        >
          Semantic Search: {settings.semanticSearchEnabled ? 'On' : 'Off'}
        </button>

        <button
          className="secondary-button w-full justify-center text-center"
          onClick={handleToggleSummary}
          type="button"
        >
          AI Summary: {settings.summaryEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-sv-border/70 bg-black/20 p-3">
        <p className="text-xs text-sv-subtext">
          Selected note: {selectedNote ? selectedNote.title : 'None selected'}
        </p>
        <button
          className="primary-button mt-3 w-full"
          disabled={!selectedNote || !settings.summaryEnabled || isSummarizing}
          onClick={handleSummarize}
          type="button"
        >
          {isSummarizing ? 'Summarizing...' : 'Summarize Selected Note'}
        </button>
      </div>

      {summary && (
        <div className="mt-4 rounded-xl border border-sv-border/70 bg-black/20 p-3 text-sm text-sv-text">
          {summary}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-sv-danger/35 bg-sv-danger/12 p-3 text-sm text-sv-danger">
          {error}
        </div>
      )}
    </section>
  )
}
