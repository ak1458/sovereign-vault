import { beforeEach, describe, expect, it } from 'vitest'
import { generateVaultKey } from '../../lib/crypto'
import { db } from '../../lib/db'
import {
  createVaultItem,
  deleteVaultItem,
  listVaultItems,
  searchVaultItemIdsByEmbedding,
  updateVaultItem,
} from './vault.service'

describe('vault service', () => {
  beforeEach(async () => {
    await db.vaultItems.clear()
    await db.vaultEmbeddings.clear()
    await db.vaultSecrets.clear()
    await db.backupSnapshots.clear()
  })

  it('creates and lists encrypted notes', async () => {
    const key = await generateVaultKey()
    await createVaultItem(
      key,
      {
        category: 'document',
        title: 'Alpha',
        content: 'First secure note',
        tags: ['one'],
      },
      [1, 0, 0],
    )

    const notes = await listVaultItems(key, { limit: 10 })

    expect(notes).toHaveLength(1)
    expect(notes[0].category).toBe('document')
    expect(notes[0].title).toBe('Alpha')
    expect(notes[0].content).toContain('secure')
  })

  it('updates note and replaces embedding', async () => {
    const key = await generateVaultKey()
    const noteId = await createVaultItem(
      key,
      {
        category: 'note',
        title: 'Title',
        content: 'Original',
        tags: [],
      },
      [1, 0, 0],
      'hash-v1',
    )

    await updateVaultItem(
      key,
      noteId,
      {
        category: 'password',
        title: 'Updated',
        content: 'Updated content',
        tags: ['x'],
      },
      [0, 1, 0],
      'hash-v2',
    )

    const notes = await listVaultItems(key, { ids: [noteId] })
    const embedding = await db.vaultEmbeddings.get(noteId)

    expect(notes[0].title).toBe('Updated')
    expect(notes[0].category).toBe('password')
    expect(embedding?.vector).toEqual([0, 1, 0])
    expect(embedding?.model).toBe('hash-v2')
  })

  it('returns ranked note ids by embedding similarity', async () => {
    const key = await generateVaultKey()
    const firstId = await createVaultItem(
      key,
      { category: 'note', title: 'One', content: 'A', tags: [] },
      [1, 0],
    )
    const secondId = await createVaultItem(
      key,
      { category: 'card', title: 'Two', content: 'B', tags: [] },
      [0.4, 0.6],
    )

    const ranked = await searchVaultItemIdsByEmbedding([1, 0], 2)

    expect(ranked[0]).toBe(firstId)
    expect(ranked).toContain(secondId)
  })

  it('deletes note and embedding together', async () => {
    const key = await generateVaultKey()
    const noteId = await createVaultItem(
      key,
      { category: 'note', title: 'Delete Me', content: 'x', tags: [] },
      [1, 1, 1],
    )

    await deleteVaultItem(noteId)

    const notes = await listVaultItems(key, { limit: 10 })
    const embedding = await db.vaultEmbeddings.get(noteId)

    expect(notes).toHaveLength(0)
    expect(embedding).toBeUndefined()
  })

  it('defaults category to note when omitted', async () => {
    const key = await generateVaultKey()
    await createVaultItem(key, { title: 'Untyped', content: 'x', tags: [] }, null)

    const notes = await listVaultItems(key, { limit: 10 })

    expect(notes).toHaveLength(1)
    expect(notes[0].category).toBe('note')
  })
})
