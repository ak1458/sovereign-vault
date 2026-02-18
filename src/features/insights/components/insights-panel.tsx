import { getVaultCategoryLabel } from '../../../core/vault-category'
import type { VaultInsights } from '../insights.service'

interface InsightsPanelProps {
  insights: VaultInsights | null
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export function InsightsPanel({
  insights,
  isLoading,
  error,
  onRefresh,
}: InsightsPanelProps) {
  return (
    <section className="sv-screen">
      {/* Header - EXACTLY 56px */}
      <header className="sv-sticky">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--accent)]">
              analytics
            </span>
            <h1 className="sv-title">Insights</h1>
          </div>
          <button className="sv-icon-btn" onClick={onRefresh}>
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <p className="sv-body text-[var(--text-secondary)]">
              Analyzing your vault patterns...
            </p>
          </div>
        )}

        {error && (
          <div className="sv-card p-4 border-l-4 border-l-[var(--danger)]">
            <p className="sv-body text-[var(--danger)]">{error}</p>
          </div>
        )}

        {!isLoading && !error && !insights && (
          <div className="sv-card p-8 text-center">
            <p className="sv-body text-[var(--text-secondary)]">
              Create and update notes to generate local insights.
            </p>
          </div>
        )}

        {insights && (
          <>
            {/* Weekly Focus Card */}
            <div className="sv-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[var(--accent)]">
                  psychology
                </span>
                <h2 className="sv-section">Your Focus This Week</h2>
              </div>
              <p className="sv-body text-[var(--text-secondary)] leading-relaxed">
                {insights.focusDrift.summary}
              </p>
            </div>

            {/* Repeated Topics Card */}
            <div className="sv-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[var(--accent)]">
                  rebase_edit
                </span>
                <h2 className="sv-section">Repeated Topics</h2>
              </div>
              {insights.repeatingIdeas.length === 0 ? (
                <p className="sv-body text-[var(--text-secondary)]">
                  No recurring topic clusters yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {insights.repeatingIdeas.map((topic) => (
                    <li
                      key={topic.label}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <span className="sv-body">{topic.label}</span>
                      <span className="sv-caption">
                        {topic.count} mentions
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Abandoned Ideas Card */}
            <div className="sv-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[var(--accent)]">
                  history
                </span>
                <h2 className="sv-section">Abandoned Ideas</h2>
              </div>
              {insights.abandonedProjects.length === 0 ? (
                <p className="sv-body text-[var(--text-secondary)]">
                  No stale items older than 3 weeks.
                </p>
              ) : (
                <ul className="space-y-3">
                  {insights.abandonedProjects.map((item) => (
                    <li
                      key={item.id}
                      className="py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <p className="sv-body font-medium">{item.title}</p>
                      <p className="sv-caption">
                        {getVaultCategoryLabel(item.category)} • idle {item.daysIdle} days
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Stats Row */}
            <div className="sv-card p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="sv-caption">Notes</p>
                  <p className="sv-title mt-1">{insights.totals.notes}</p>
                </div>
                <div>
                  <p className="sv-caption">This Week</p>
                  <p className="sv-title mt-1">{insights.totals.updatedThisWeek}</p>
                </div>
                <div>
                  <p className="sv-caption">Abandoned</p>
                  <p className="sv-title mt-1">{insights.totals.abandonedCount}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
