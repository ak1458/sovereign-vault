import { useEffect, useState, type ChangeEvent, type RefObject } from 'react'
import {
  createBackupSnapshot,
  exportEncryptedVaultBackup,
  importEncryptedVaultBackup,
  listBackupSnapshots,
  restoreBackupSnapshot,
  type BackupSnapshotSummary,
} from '../../backup/backup.service'

const snapshotDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface UseBackupActionsOptions {
  isUnlocked: boolean
  sessionKey: CryptoKey | null
  latestItemToken: string
  backupFileInputRef: RefObject<HTMLInputElement | null>
}

export function useBackupActions({
  isUnlocked,
  sessionKey,
  latestItemToken,
  backupFileInputRef,
}: UseBackupActionsOptions) {
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshotSummary[]>([])
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [isExportingBackup, setIsExportingBackup] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [isSnapshotting, setIsSnapshotting] = useState(false)

  // Load snapshots when unlocked or items change
  useEffect(() => {
    if (!isUnlocked) {
      setBackupSnapshots([])
      return
    }

    let isCancelled = false

    const loadSnapshots = async () => {
      try {
        const snapshots = await listBackupSnapshots()
        if (!isCancelled) {
          setBackupSnapshots(snapshots)
        }
      } catch {
        if (!isCancelled) {
          setBackupSnapshots([])
        }
      }
    }

    void loadSnapshots()

    return () => {
      isCancelled = true
    }
  }, [isUnlocked, latestItemToken])

  const handleCreateSnapshot = async () => {
    if (!isUnlocked || !sessionKey) {
      setBackupError('Unlock vault before creating snapshot.')
      return
    }

    setIsSnapshotting(true)
    setBackupStatus(null)
    setBackupError(null)

    try {
      const snapshot = await createBackupSnapshot(sessionKey, 'manual')
      setBackupSnapshots((current) => [snapshot, ...current].slice(0, 10))
      setBackupStatus(`Snapshot created at ${snapshotDateFormatter.format(snapshot.createdAt)}.`)
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Failed to create backup snapshot.',
      )
    } finally {
      setIsSnapshotting(false)
    }
  }

  const handleRestoreSnapshot = async (id: string) => {
    setBackupStatus(null)
    setBackupError(null)

    try {
      const summary = await restoreBackupSnapshot(id)
      setBackupStatus(`Snapshot restored: ${summary.itemCount} encrypted notes imported.`)
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Failed to restore snapshot.',
      )
    }
  }

  const handleExportBackup = async () => {
    if (!isUnlocked || !sessionKey) {
      setBackupError('Unlock vault before exporting backup.')
      return
    }

    setIsExportingBackup(true)
    setBackupStatus(null)
    setBackupError(null)

    try {
      const backup = await exportEncryptedVaultBackup(sessionKey)
      const url = URL.createObjectURL(backup.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = backup.filename
      anchor.click()
      URL.revokeObjectURL(url)

      setBackupStatus(`Backup exported: ${backup.itemCount} encrypted notes.`)
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Failed to export backup.',
      )
    } finally {
      setIsExportingBackup(false)
    }
  }

  const handleImportFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsImportingBackup(true)
    setBackupStatus(null)
    setBackupError(null)

    try {
      const summary = await importEncryptedVaultBackup(file)
      setBackupStatus(`Imported backup: ${summary.itemCount} items restored.`)
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : 'Failed to import backup.',
      )
    } finally {
      setIsImportingBackup(false)
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = ''
      }
    }
  }

  return {
    backupError,
    backupSnapshots,
    backupStatus,
    isExportingBackup,
    isImportingBackup,
    isSnapshotting,
    handleCreateSnapshot,
    handleExportBackup,
    handleImportFileSelected,
    handleRestoreSnapshot,
    setBackupError,
    setBackupStatus,
  }
}
