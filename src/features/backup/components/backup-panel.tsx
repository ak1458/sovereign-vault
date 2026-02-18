import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  createBackupSnapshot,
  exportEncryptedVaultBackup,
  importEncryptedVaultBackup,
  listBackupSnapshots,
  restoreBackupSnapshot,
  type BackupSnapshotSummary,
} from '../backup.service'

interface BackupPanelProps {
  sessionKey: CryptoKey
  autoSnapshotEnabled: boolean
  setAutoSnapshotEnabled: Dispatch<SetStateAction<boolean>>
  onImportCompleted?: () => void
}

const snapshotDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function BackupPanel({
  sessionKey,
  autoSnapshotEnabled,
  setAutoSnapshotEnabled,
  onImportCompleted,
}: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSnapshotting, setIsSnapshotting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<BackupSnapshotSummary[]>([])

  const refreshSnapshots = async () => {
    const entries = await listBackupSnapshots()
    setSnapshots(entries)
  }

  useEffect(() => {
    void refreshSnapshots()
  }, [])

  const clearMessages = () => {
    setErrorMessage(null)
    setStatusMessage(null)
  }

  const handleExport = async () => {
    if (isExporting || isImporting || isSnapshotting) {
      return
    }

    clearMessages()
    setIsExporting(true)

    try {
      const backup = await exportEncryptedVaultBackup(sessionKey)
      const downloadUrl = URL.createObjectURL(backup.blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = backup.filename
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)

      setStatusMessage(`Backup exported: ${backup.itemCount} encrypted notes.`)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Backup export failed unexpectedly.'
      setErrorMessage(message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCreateSnapshot = async () => {
    if (isExporting || isImporting || isSnapshotting) {
      return
    }

    clearMessages()
    setIsSnapshotting(true)

    try {
      const snapshot = await createBackupSnapshot(sessionKey, 'manual')
      await refreshSnapshots()
      setStatusMessage(
        `Snapshot created: ${snapshot.itemCount} notes at ${snapshotDateFormatter.format(snapshot.createdAt)}.`,
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Snapshot creation failed.'
      setErrorMessage(message)
    } finally {
      setIsSnapshotting(false)
    }
  }

  const handleImportClick = () => {
    if (isExporting || isImporting || isSnapshotting) {
      return
    }

    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || isExporting || isImporting || isSnapshotting) {
      return
    }

    const shouldProceed = window.confirm(
      'Import will overwrite the current local vault on this device. Continue?',
    )
    if (!shouldProceed) {
      return
    }

    clearMessages()
    setIsImporting(true)

    try {
      const result = await importEncryptedVaultBackup(file)
      setStatusMessage(
        `Backup restored: ${result.itemCount} encrypted notes imported.`,
      )
      onImportCompleted?.()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Backup import failed unexpectedly.'
      setErrorMessage(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (isExporting || isImporting || isSnapshotting) {
      return
    }

    const shouldProceed = window.confirm(
      'Restore snapshot will overwrite the current local vault. Continue?',
    )
    if (!shouldProceed) {
      return
    }

    clearMessages()
    setIsImporting(true)

    try {
      const result = await restoreBackupSnapshot(snapshotId)
      setStatusMessage(
        `Snapshot restored: ${result.itemCount} encrypted notes imported.`,
      )
      onImportCompleted?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Snapshot restore failed.'
      setErrorMessage(message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="glass-card flex h-full flex-col p-4">
      <h2 className="text-lg font-semibold tracking-tight text-sv-text">Local Backup</h2>
      <p className="mt-2 text-sm text-sv-subtext">
        Export or import encrypted backup files (`vault_backup.vlt`) and manage
        auto snapshots.
      </p>

      <div className="mt-4 rounded-xl border border-sv-border/70 bg-black/20 p-3 text-xs text-sv-subtext">
        Import/restore replaces current local vault items and key metadata.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="primary-button"
          disabled={isExporting || isImporting || isSnapshotting}
          onClick={handleExport}
          type="button"
        >
          {isExporting ? 'Exporting...' : 'Export Backup'}
        </button>

        <button
          className="secondary-button"
          disabled={isExporting || isImporting || isSnapshotting}
          onClick={handleImportClick}
          type="button"
        >
          {isImporting ? 'Importing...' : 'Import Backup'}
        </button>

        <button
          className="secondary-button"
          disabled={isExporting || isImporting || isSnapshotting}
          onClick={handleCreateSnapshot}
          type="button"
        >
          {isSnapshotting ? 'Snapshotting...' : 'Create Snapshot'}
        </button>

        <input
          accept=".vlt,application/octet-stream,application/json"
          className="hidden"
          onChange={handleImportFile}
          ref={fileInputRef}
          type="file"
        />
      </div>

      <button
        className="secondary-button mt-4"
        onClick={() => setAutoSnapshotEnabled((value) => !value)}
        type="button"
      >
        Auto Snapshot: {autoSnapshotEnabled ? 'On' : 'Off'}
      </button>

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-sv-border/70 bg-black/20 p-3">
        <h3 className="text-sm font-semibold text-sv-text">Recent Snapshots</h3>
        {snapshots.length === 0 ? (
          <p className="mt-2 text-xs text-sv-subtext">No snapshots available yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshots.map((snapshot) => (
              <li
                className="rounded-lg border border-sv-border/60 bg-black/20 p-2.5"
                key={snapshot.id}
              >
                <p className="text-xs text-sv-text">
                  {snapshotDateFormatter.format(snapshot.createdAt)} |{' '}
                  {snapshot.itemCount} notes | {snapshot.source}
                </p>
                <button
                  className="secondary-button mt-2 px-2.5 py-1 text-xs"
                  disabled={isExporting || isImporting || isSnapshotting}
                  onClick={() => handleRestoreSnapshot(snapshot.id)}
                  type="button"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {statusMessage && (
        <p className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {statusMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-sv-danger/35 bg-sv-danger/12 px-3 py-2 text-sm text-sv-danger">
          {errorMessage}
        </p>
      )}
    </section>
  )
}
