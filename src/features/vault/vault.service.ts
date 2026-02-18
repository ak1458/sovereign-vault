import {
  decryptJsonPayload,
  deriveWrappingKeyFromPrfSecret,
  encryptJsonPayload,
  generateVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
} from '../../lib/crypto'
import { getPasskeyPrfSecret, registerPlatformPasskey } from '../../lib/passkey'
import { db } from '../../lib/db'
import { cosineSimilarity } from '../ai/vector'
import {
  DEFAULT_VAULT_CATEGORY,
  normalizeVaultCategory,
  type VaultCategory,
} from '../../core/vault-category'
import type {
  VaultEmbeddingRecord,
  VaultEncryptedItem,
  VaultItem,
  VaultItemDraft,
  VaultSecretRecord,
} from './types'

const UNTITLED_LABEL = 'Untitled'
const PRIMARY_SECRET_ID = 'primary'
const VAULT_KEY_VERSION = 1

interface LegacyVaultSecretRecord {
  id: string
  key: CryptoKey
  createdAt?: number
  updatedAt?: number
}

interface VaultPayload {
  category: VaultCategory
  title: string
  content: string
  tags: string[]
}

export interface ListVaultItemsOptions {
  ids?: string[]
  limit?: number
  offset?: number
}

const normalizeTitle = (title: string): string => {
  const nextTitle = title.trim()
  return nextTitle.length > 0 ? nextTitle : UNTITLED_LABEL
}

const normalizeTags = (tags: string[]): string[] => {
  const unique = new Set<string>()

  for (const rawTag of tags) {
    const tag = rawTag.trim().toLowerCase()

    if (tag.length > 0) {
      unique.add(tag)
    }
  }

  return [...unique]
}

const normalizeDraft = (draft: Partial<VaultItemDraft> = {}): VaultPayload => {
  return {
    category: normalizeVaultCategory(draft.category),
    title: normalizeTitle(draft.title ?? ''),
    content: draft.content?.trim() ?? '',
    tags: normalizeTags(draft.tags ?? []),
  }
}

const toEmbeddingText = (payload: VaultPayload): string => {
  return [
    payload.category,
    payload.title,
    payload.tags.join(' '),
    payload.content,
  ]
    .join('\n')
    .trim()
}

const normalizeEmbeddingVector = (
  vector: number[] | Float32Array | null | undefined,
): number[] | null => {
  if (!vector) {
    return null
  }

  const normalized = Array.from(vector).filter((value) => Number.isFinite(value))

  if (normalized.length === 0) {
    return null
  }

  return normalized
}

const isRecordObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const isArrayBufferObject = (value: unknown): value is ArrayBuffer => {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]'
}

const isByteSource = (value: unknown): value is ArrayBuffer | ArrayBufferView => {
  return isArrayBufferObject(value) || ArrayBuffer.isView(value)
}

const toUint8Array = (value: ArrayBuffer | ArrayBufferView): Uint8Array => {
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }

  return new Uint8Array(value)
}

const isEncryptedRecord = (
  item: VaultEncryptedItem,
): item is VaultEncryptedItem & {
  encryptedPayload: ArrayBuffer | ArrayBufferView
  iv: ArrayBuffer | ArrayBufferView
} => {
  return isByteSource(item.encryptedPayload) && isByteSource(item.iv)
}

const isLegacyPlaintextRecord = (item: VaultEncryptedItem): boolean => {
  return (
    !isEncryptedRecord(item) &&
    (typeof item.title === 'string' ||
      typeof item.content === 'string' ||
      Array.isArray(item.tags))
  )
}

const isPasskeySecretRecord = (record: unknown): record is VaultSecretRecord => {
  if (!isRecordObject(record)) {
    return false
  }

  return (
    typeof record.id === 'string' &&
    isByteSource(record.credentialId) &&
    isByteSource(record.wrapSalt) &&
    isByteSource(record.wrappedVaultKey) &&
    isByteSource(record.wrappedVaultKeyIv) &&
    typeof record.keyVersion === 'number' &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  )
}

const isLegacySecretRecord = (
  record: unknown,
): record is LegacyVaultSecretRecord => {
  if (!isRecordObject(record)) {
    return false
  }

  return typeof record.id === 'string' && record.key instanceof CryptoKey
}

async function getStoredSecretRecord(): Promise<unknown> {
  return (await db.vaultSecrets.get(PRIMARY_SECRET_ID)) as unknown
}

async function decryptVaultRecord(
  key: CryptoKey,
  record: VaultEncryptedItem,
): Promise<VaultItem | null> {
  if (!isEncryptedRecord(record)) {
    return null
  }

  const payload = await decryptJsonPayload<VaultPayload>(
    key,
    toUint8Array(record.iv),
    toUint8Array(record.encryptedPayload),
  )

  return {
    id: record.id,
    category: normalizeVaultCategory(payload.category),
    title: payload.title,
    content: payload.content,
    tags: payload.tags,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

async function rotateVaultEncryptionKey(
  fromKey: CryptoKey,
  toKey: CryptoKey,
): Promise<void> {
  const records = await db.vaultItems.toArray()

  await Promise.all(
    records.map(async (record) => {
      let payload: VaultPayload

      if (isEncryptedRecord(record)) {
        payload = await decryptJsonPayload<VaultPayload>(
          fromKey,
          toUint8Array(record.iv),
          toUint8Array(record.encryptedPayload),
        )
      } else if (isLegacyPlaintextRecord(record)) {
        payload = normalizeDraft({
          category: DEFAULT_VAULT_CATEGORY,
          title: record.title,
          content: record.content,
          tags: record.tags,
        })
      } else {
        return
      }

      const encrypted = await encryptJsonPayload(toKey, payload)

      await db.vaultItems.put({
        id: record.id,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })
    }),
  )
}

async function upsertVaultEmbedding(
  noteId: string,
  vector: number[] | Float32Array | null | undefined,
  model = 'hash-v1',
): Promise<void> {
  const normalized = normalizeEmbeddingVector(vector)

  if (!normalized) {
    await db.vaultEmbeddings.delete(noteId)
    return
  }

  const record: VaultEmbeddingRecord = {
    noteId,
    vector: normalized,
    model,
    updatedAt: Date.now(),
  }

  await db.vaultEmbeddings.put(record)
}

export async function isPasskeyProtectionEnabled(): Promise<boolean> {
  const record = await getStoredSecretRecord()
  return isPasskeySecretRecord(record)
}

export async function setupPasskeyProtection(
  displayName = 'Vault Owner',
): Promise<CryptoKey> {
  const existingRecord = await getStoredSecretRecord()
  if (isPasskeySecretRecord(existingRecord)) {
    return unlockVaultWithPasskey()
  }

  const passkey = await registerPlatformPasskey(displayName)
  const prfSecret = await getPasskeyPrfSecret(
    passkey.credentialId,
    passkey.wrapSalt,
  )
  const wrappingKey = await deriveWrappingKeyFromPrfSecret(prfSecret)

  let activeVaultKey: CryptoKey
  const now = Date.now()
  const createdAtFromExisting =
    isLegacySecretRecord(existingRecord) &&
    typeof existingRecord.createdAt === 'number'
      ? existingRecord.createdAt
      : now

  if (isLegacySecretRecord(existingRecord)) {
    if (existingRecord.key.extractable) {
      activeVaultKey = existingRecord.key
    } else {
      activeVaultKey = await generateVaultKey()
      await rotateVaultEncryptionKey(existingRecord.key, activeVaultKey)
    }
  } else {
    activeVaultKey = await generateVaultKey()
  }

  const wrappedVaultKey = await wrapVaultKey(activeVaultKey, wrappingKey)

  await db.vaultSecrets.put({
    id: PRIMARY_SECRET_ID,
    credentialId: passkey.credentialId,
    wrapSalt: passkey.wrapSalt,
    wrappedVaultKey: wrappedVaultKey.wrappedVaultKey,
    wrappedVaultKeyIv: wrappedVaultKey.wrappedVaultKeyIv,
    keyVersion: VAULT_KEY_VERSION,
    createdAt: createdAtFromExisting,
    updatedAt: now,
  })

  return activeVaultKey
}

export async function unlockVaultWithPasskey(): Promise<CryptoKey> {
  const storedRecord = await getStoredSecretRecord()

  if (!isPasskeySecretRecord(storedRecord)) {
    throw new Error('Vault passkey is not configured.')
  }

  const prfSecret = await getPasskeyPrfSecret(
    toUint8Array(storedRecord.credentialId),
    toUint8Array(storedRecord.wrapSalt),
  )
  const wrappingKey = await deriveWrappingKeyFromPrfSecret(prfSecret)

  return unwrapVaultKey(
    toUint8Array(storedRecord.wrappedVaultKey),
    toUint8Array(storedRecord.wrappedVaultKeyIv),
    wrappingKey,
  )
}

export async function migrateLegacyPlaintextNotes(
  key: CryptoKey,
): Promise<void> {
  const notes = await db.vaultItems.toArray()
  const legacyItems = notes.filter(isLegacyPlaintextRecord)

  if (legacyItems.length === 0) {
    return
  }

  await Promise.all(
    legacyItems.map(async (legacyItem) => {
      const payload = normalizeDraft({
        category: DEFAULT_VAULT_CATEGORY,
        title: legacyItem.title,
        content: legacyItem.content,
        tags: legacyItem.tags,
      })
      const encrypted = await encryptJsonPayload(key, payload)

      await db.vaultItems.put({
        id: legacyItem.id,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        createdAt: legacyItem.createdAt,
        updatedAt: legacyItem.updatedAt,
      })
    }),
  )
}

export async function listVaultItemsCount(): Promise<number> {
  return db.vaultItems.count()
}

export async function listVaultItems(
  key: CryptoKey,
  options: ListVaultItemsOptions = {},
): Promise<VaultItem[]> {
  await migrateLegacyPlaintextNotes(key)

  let records: VaultEncryptedItem[]

  if (options.ids && options.ids.length > 0) {
    const mapped = await db.vaultItems.bulkGet(options.ids)
    records = mapped.filter((entry): entry is VaultEncryptedItem => !!entry)
  } else {
    const offset = options.offset ?? 0
    const limit = options.limit ?? 50

    records = await db.vaultItems
      .orderBy('updatedAt')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray()
  }

  const decryptedItems = await Promise.all(
    records.map(async (item) => {
      try {
        return await decryptVaultRecord(key, item)
      } catch {
        return null
      }
    }),
  )

  const notes = decryptedItems.filter((item): item is VaultItem => item !== null)

  if (!options.ids || options.ids.length === 0) {
    return notes
  }

  const lookup = new Map(notes.map((note) => [note.id, note]))
  return options.ids.map((id) => lookup.get(id)).filter((item): item is VaultItem => !!item)
}

export async function createVaultItem(
  key: CryptoKey,
  seed: Partial<VaultItemDraft> = {},
  embedding?: number[] | Float32Array | null,
  embeddingModel = 'hash-v1',
): Promise<string> {
  const now = Date.now()
  const id = crypto.randomUUID()
  const payload = normalizeDraft(seed)
  const encrypted = await encryptJsonPayload(key, payload)

  const item: VaultEncryptedItem = {
    id,
    encryptedPayload: encrypted.encryptedPayload,
    iv: encrypted.iv,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.vaultItems, db.vaultEmbeddings, async () => {
    await db.vaultItems.add(item)
    await upsertVaultEmbedding(id, embedding, embeddingModel)
  })

  return id
}

export async function updateVaultItem(
  key: CryptoKey,
  id: string,
  draft: VaultItemDraft,
  embedding?: number[] | Float32Array | null,
  embeddingModel = 'hash-v1',
): Promise<void> {
  const payload = normalizeDraft(draft)
  const encrypted = await encryptJsonPayload(key, payload)

  await db.transaction('rw', db.vaultItems, db.vaultEmbeddings, async () => {
    await db.vaultItems.update(id, {
      encryptedPayload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      updatedAt: Date.now(),
    })
    await upsertVaultEmbedding(id, embedding, embeddingModel)
  })
}

export async function deleteVaultItem(id: string): Promise<void> {
  await db.transaction('rw', db.vaultItems, db.vaultEmbeddings, async () => {
    await db.vaultItems.delete(id)
    await db.vaultEmbeddings.delete(id)
  })
}

export async function searchVaultItemIdsByEmbedding(
  queryVector: number[],
  topK = 25,
): Promise<string[]> {
  const embeddings = await db.vaultEmbeddings.toArray()

  const scored = embeddings
    .map((record) => ({
      noteId: record.noteId,
      score: cosineSimilarity(queryVector, record.vector),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored.map((entry) => entry.noteId)
}

export async function rebuildVaultEmbeddings(
  key: CryptoKey,
  embed: (text: string) => Promise<{ vector: number[]; model: string }>,
): Promise<void> {
  const notes = await listVaultItems(key, { limit: 500 })
  const existingEmbeddings = await db.vaultEmbeddings.toArray()
  const embeddedIds = new Set(existingEmbeddings.map((entry) => entry.noteId))
  const missing = notes.filter((note) => !embeddedIds.has(note.id))

  await Promise.all(
    missing.map(async (note) => {
      const payload = normalizeDraft({
        category: note.category,
        title: note.title,
        content: note.content,
        tags: note.tags,
      })
      const result = await embed(toEmbeddingText(payload))
      await upsertVaultEmbedding(note.id, result.vector, result.model)
    }),
  )
}

export function buildVaultEmbeddingText(draft: VaultItemDraft): string {
  return toEmbeddingText(normalizeDraft(draft))
}
