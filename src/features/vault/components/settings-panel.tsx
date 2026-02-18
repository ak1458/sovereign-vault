import type { ChangeEvent, RefObject } from 'react'
import type { BackupSnapshotSummary } from '../../backup/backup.service'

type ThemeMode = 'light' | 'dark'

interface SettingsPanelProps {
  themeMode: ThemeMode
  lockTimeoutMinutes: number
  autoSnapshotEnabled: boolean
  semanticSearchEnabled: boolean
  summaryEnabled: boolean
  canInstall: boolean
  isInstalled: boolean
  installResult: string | null
  backupStatus: string | null
  backupError: string | null
  backupSnapshots: BackupSnapshotSummary[]
  busyBackup: boolean
  isSnapshotting: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  onToggleTheme: () => void
  onSetTheme: (theme: ThemeMode) => void
  onInstall: () => void
  onLock: () => void
  onToggleAutoSnapshot: () => void
  onToggleSemanticSearch: () => void
  onToggleSummary: () => void
  onExportBackup: () => void
  onOpenImportPicker: () => void
  onCreateSnapshot: () => void
  onRestoreSnapshot: (snapshotId: string) => void
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
}

const snapshotDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function SettingsPanel({
  themeMode,
  lockTimeoutMinutes,
  autoSnapshotEnabled,
  semanticSearchEnabled,
  summaryEnabled,
  canInstall,
  isInstalled,
  installResult,
  backupStatus,
  backupError,
  backupSnapshots,
  busyBackup,
  isSnapshotting,
  fileInputRef,
  onToggleTheme,
  onSetTheme,
  onInstall,
  onLock,
  onToggleAutoSnapshot,
  onToggleSemanticSearch,
  onToggleSummary,
  onExportBackup,
  onOpenImportPicker,
  onCreateSnapshot,
  onRestoreSnapshot,
  onImportFile,
}: SettingsPanelProps) {
  return (
    <section className="sv-screen">
      {/* Header - EXACTLY 56px */}
      <header className="sv-sticky">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[var(--accent)]">
              settings
            </span>
            <h1 className="sv-title">Settings</h1>
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
        {/* Vault Section */}
        <div>
          <h2 className="sv-caption uppercase tracking-wider mb-2 px-1">Vault</h2>
          <div className="sv-card">
            <div className="sv-row">
              <span className="sv-body">Auto-lock timer</span>
              <span className="sv-caption">{lockTimeoutMinutes} minutes</span>
            </div>
            <button
              className="sv-row w-full text-left"
              onClick={onExportBackup}
              disabled={busyBackup}
            >
              <span className="sv-body">Export vault</span>
              <span className="material-symbols-outlined text-[var(--text-secondary)]">
                chevron_right
              </span>
            </button>
            <button
              className="sv-row w-full text-left"
              onClick={onOpenImportPicker}
              disabled={busyBackup}
            >
              <span className="sv-body">Restore vault</span>
              <span className="material-symbols-outlined text-[var(--text-secondary)]">
                chevron_right
              </span>
            </button>
            <label className="sv-row cursor-pointer">
              <span className="sv-body">Auto snapshot</span>
              <input
                type="checkbox"
                className="sv-toggle"
                checked={autoSnapshotEnabled}
                onChange={onToggleAutoSnapshot}
              />
            </label>
            <button
              className="sv-row w-full text-left"
              onClick={onCreateSnapshot}
              disabled={busyBackup}
            >
              <span className="sv-body">Create snapshot</span>
              <span className="sv-caption">
                {isSnapshotting ? 'Working...' : 'Now'}
              </span>
            </button>
          </div>
        </div>

        {/* AI Section */}
        <div>
          <h2 className="sv-caption uppercase tracking-wider mb-2 px-1">AI</h2>
          <div className="sv-card">
            <label className="sv-row cursor-pointer">
              <span className="sv-body">Local AI search</span>
              <input
                type="checkbox"
                className="sv-toggle"
                checked={semanticSearchEnabled}
                onChange={onToggleSemanticSearch}
              />
            </label>
            <label className="sv-row cursor-pointer">
              <span className="sv-body">Cloud summary mode</span>
              <input
                type="checkbox"
                className="sv-toggle"
                checked={summaryEnabled}
                onChange={onToggleSummary}
              />
            </label>
            <div className="sv-row">
              <span className="sv-body">Provider</span>
              <span className="sv-caption">On-device + optional cloud</span>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div>
          <h2 className="sv-caption uppercase tracking-wider mb-2 px-1">Account</h2>
          <div className="sv-card">
            <button
              className="sv-row w-full text-left"
              onClick={onInstall}
              disabled={!canInstall}
            >
              <span className="sv-body">Install App</span>
              <span className="sv-caption">
                {isInstalled ? 'Installed' : canInstall ? 'Available' : 'Unavailable'}
              </span>
            </button>
            <div className="sv-row">
              <span className="sv-body">Theme</span>
              <div className="flex gap-1 bg-[var(--bg)] p-1 rounded-lg">
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    themeMode === 'light'
                      ? 'bg-white shadow-sm text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                  onClick={() => onSetTheme('light')}
                >
                  Light
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    themeMode === 'dark'
                      ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                  onClick={() => onSetTheme('dark')}
                >
                  Dark
                </button>
              </div>
            </div>
            <button className="sv-row w-full text-left" onClick={onLock}>
              <span className="sv-body">Lock vault now</span>
              <span className="material-symbols-outlined text-[var(--text-secondary)]">
                lock
              </span>
            </button>
          </div>
        </div>

        {/* Snapshots Section */}
        {backupSnapshots.length > 0 && (
          <div>
            <h2 className="sv-caption uppercase tracking-wider mb-2 px-1">Snapshots</h2>
            <div className="sv-card p-3">
              <ul className="space-y-2">
                {backupSnapshots.map((snapshot) => (
                  <li
                    key={snapshot.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <div>
                      <p className="sv-body">
                        {snapshotDateFormatter.format(snapshot.createdAt)}
                      </p>
                      <p className="sv-caption">
                        {snapshot.itemCount} notes • {snapshot.source}
                      </p>
                    </div>
                    <button
                      className="sv-btn-primary text-xs px-3 py-1.5"
                      onClick={() => onRestoreSnapshot(snapshot.id)}
                      disabled={busyBackup}
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {installResult && (
          <div className="sv-card p-3 text-center">
            <p className="sv-body">{installResult}</p>
          </div>
        )}
        {backupStatus && (
          <div className="sv-card p-3 text-center border-l-4 border-l-[var(--success)]">
            <p className="sv-body text-[var(--success)]">{backupStatus}</p>
          </div>
        )}
        {backupError && (
          <div className="sv-card p-3 text-center border-l-4 border-l-[var(--danger)]">
            <p className="sv-body text-[var(--danger)]">{backupError}</p>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".vlt,application/octet-stream,application/json"
        className="hidden"
        onChange={onImportFile}
      />
    </section>
  )
}
