import Dexie, { type Table } from 'dexie'
import type {
  VaultBackupSnapshotRecord,
  VaultEmbeddingRecord,
  VaultEncryptedItem,
  VaultSecretRecord,
} from '../features/vault/types'

class VaultDatabase extends Dexie {
  vaultItems!: Table<VaultEncryptedItem, string>
  vaultSecrets!: Table<VaultSecretRecord, string>
  vaultEmbeddings!: Table<VaultEmbeddingRecord, string>
  backupSnapshots!: Table<VaultBackupSnapshotRecord, string>

  constructor() {
    super('sovereign_vault')
    this.version(1).stores({
      vaultItems: 'id, createdAt, updatedAt, title, *tags',
    })
    this.version(2).stores({
      vaultItems: 'id, createdAt, updatedAt',
      vaultSecrets: 'id, createdAt, updatedAt',
    })
    this.version(3).stores({
      vaultItems: 'id, createdAt, updatedAt',
      vaultSecrets: 'id, createdAt, updatedAt',
      vaultEmbeddings: 'noteId, updatedAt',
      backupSnapshots: 'id, source, createdAt',
    })
  }
}

export const db = new VaultDatabase()
