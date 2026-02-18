import { beforeEach, describe, expect, it } from 'vitest'
import { generateVaultKey } from '../../lib/crypto'
import { db } from '../../lib/db'
import { createVaultItem, listVaultItems } from '../vault/vault.service'
import {
  createBackupSnapshot,
  exportEncryptedVaultBackup,
  importEncryptedVaultBackup,
  listBackupSnapshots,
  restoreBackupSnapshot,
} from './backup.service'

const randomBytes = (size: number): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(size))

describe('backup service', () => {
  beforeEach(async () => {
    await db.vaultItems.clear()
    await db.vaultEmbeddings.clear()
    await db.vaultSecrets.clear()
    await db.backupSnapshots.clear()
  })

  it('exports and imports encrypted backup file', async () => {
    const key = await generateVaultKey()

    await db.vaultSecrets.put({
      id: 'primary',
      credentialId: randomBytes(32),
      wrapSalt: randomBytes(32),
      wrappedVaultKey: randomBytes(64),
      wrappedVaultKeyIv: randomBytes(12),
      keyVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    await createVaultItem(
      key,
      {
        category: 'password',
        title: 'Backed Note',
        content: 'Encrypted payload',
        tags: ['backup'],
      },
      [0.5, 0.2, 0.9],
    )

    const backup = await exportEncryptedVaultBackup(key)
    const file = new File([backup.blob], backup.filename, {
      type: 'application/octet-stream',
    })

    await db.vaultItems.clear()
    await db.vaultEmbeddings.clear()

    const result = await importEncryptedVaultBackup(file)
    const notes = await listVaultItems(key, { limit: 10 })
    const embeddings = await db.vaultEmbeddings.toArray()

    expect(result.itemCount).toBe(1)
    expect(notes[0].category).toBe('password')
    expect(notes[0].title).toBe('Backed Note')
    expect(embeddings).toHaveLength(1)
  })

  it('creates and restores local snapshot', async () => {
    const key = await generateVaultKey()

    await db.vaultSecrets.put({
      id: 'primary',
      credentialId: randomBytes(32),
      wrapSalt: randomBytes(32),
      wrappedVaultKey: randomBytes(64),
      wrappedVaultKeyIv: randomBytes(12),
      keyVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const id = await createVaultItem(
      key,
      {
        category: 'document',
        title: 'Snapshot Note',
        content: 'Before restore',
        tags: [],
      },
      [1, 0, 0],
    )

    await createBackupSnapshot(key, 'manual')
    const snapshots = await listBackupSnapshots()

    await db.vaultItems.update(id, {
      updatedAt: Date.now(),
    })

    await restoreBackupSnapshot(snapshots[0].id)
    const notes = await listVaultItems(key, { limit: 10 })

    expect(snapshots.length).toBeGreaterThan(0)
    expect(notes[0].category).toBe('document')
    expect(notes[0].title).toBe('Snapshot Note')
  })

  it('rejects tampered backup checksum', async () => {
    const key = await generateVaultKey()

    await db.vaultSecrets.put({
      id: 'primary',
      credentialId: randomBytes(32),
      wrapSalt: randomBytes(32),
      wrappedVaultKey: randomBytes(64),
      wrappedVaultKeyIv: randomBytes(12),
      keyVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    await createVaultItem(
      key,
      {
        category: 'card',
        title: 'Integrity',
        content: 'Checksum matters',
        tags: [],
      },
      [0.2, 0.3, 0.4],
    )

    const backup = await exportEncryptedVaultBackup(key)
    const raw = JSON.parse(await backup.blob.text()) as {
      checksum?: string
    }
    raw.checksum = 'deadbeef'

    const tampered = new File([JSON.stringify(raw)], backup.filename, {
      type: 'application/octet-stream',
    })

    await expect(importEncryptedVaultBackup(tampered)).rejects.toThrow(
      'Backup checksum mismatch',
    )
  })
})
