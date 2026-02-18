import type { VaultCategory } from '../../core/vault-category'

export interface VaultItem {
  id: string
  category: VaultCategory
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface VaultItemDraft {
  category: VaultCategory
  title: string
  content: string
  tags: string[]
}

export interface VaultEncryptedItem {
  id: string
  encryptedPayload?: Uint8Array
  iv?: Uint8Array
  createdAt: number
  updatedAt: number
  title?: string
  content?: string
  tags?: string[]
}

export interface VaultSecretRecord {
  id: string
  credentialId: Uint8Array
  wrapSalt: Uint8Array
  wrappedVaultKey: Uint8Array
  wrappedVaultKeyIv: Uint8Array
  keyVersion: number
  createdAt: number
  updatedAt: number
}

export interface VaultEmbeddingRecord {
  noteId: string
  vector: number[]
  model: string
  updatedAt: number
}

export interface VaultBackupSnapshotRecord {
  id: string
  payload: Uint8Array
  source: 'auto' | 'manual'
  itemCount: number
  createdAt: number
}
