import { loadJsonObject, persistJsonObject } from '../../storage/browser-json-store'

export interface BackupSettings {
  autoSnapshotEnabled: boolean
}

const STORAGE_KEY = 'sv_backup_settings'

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  autoSnapshotEnabled: true,
}

export const loadBackupSettings = (): BackupSettings => {
  const parsed = loadJsonObject(STORAGE_KEY)
  if (!parsed) {
    return DEFAULT_BACKUP_SETTINGS
  }

  return {
    autoSnapshotEnabled:
      typeof parsed.autoSnapshotEnabled === 'boolean'
        ? parsed.autoSnapshotEnabled
        : DEFAULT_BACKUP_SETTINGS.autoSnapshotEnabled,
  }
}

export const persistBackupSettings = (settings: BackupSettings): void => {
  persistJsonObject(STORAGE_KEY, settings)
}
