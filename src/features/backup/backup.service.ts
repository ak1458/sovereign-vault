import { db } from '../../lib/db'
import type {
  VaultBackupSnapshotRecord,
  VaultEmbeddingRecord,
  VaultEncryptedItem,
  VaultSecretRecord,
} from '../vault/types'
import { migrateLegacyPlaintextNotes } from '../vault/vault.service'

const BACKUP_FORMAT = 'sovereign-vault-backup'
const BACKUP_VERSION = 2
const LEGACY_BACKUP_VERSION = 1
const PRIMARY_SECRET_ID = 'primary'
const BACKUP_FILENAME = 'vault_backup.vlt'
const MAX_SNAPSHOTS = 10

interface SerializedVaultItem {
  id: string
  encryptedPayload: string
  iv: string
  createdAt: number
  updatedAt: number
}

interface SerializedVaultEmbedding {
  noteId: string
  vector: number[]
  model: string
  updatedAt: number
}

interface SerializedVaultSecret {
  id: string
  credentialId: string
  wrapSalt: string
  wrappedVaultKey: string
  wrappedVaultKeyIv: string
  keyVersion: number
  createdAt: number
  updatedAt: number
}

interface SerializedBackupEnvelopeV2 {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: number
  checksum?: string
  vault: {
    items: SerializedVaultItem[]
    embeddings?: SerializedVaultEmbedding[]
    secret: SerializedVaultSecret
  }
}

interface ParsedBackupResult {
  itemCount: number
}

export interface BackupSnapshotSummary {
  id: string
  source: 'auto' | 'manual'
  itemCount: number
  createdAt: number
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const isObject = (value: unknown): value is Record<string, unknown> => {
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

const ensureString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid backup field "${field}".`)
  }

  return value
}

const ensureNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid backup field "${field}".`)
  }

  return value
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  const chunkSize = 0x8000
  let output = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    output += String.fromCharCode(...chunk)
  }

  return btoa(output)
}

const base64ToBytes = (encoded: string): Uint8Array => {
  let binary: string

  try {
    binary = atob(encoded)
  } catch {
    throw new Error('Backup file is corrupted (base64 decode failed).')
  }

  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

const isEncryptedVaultItem = (
  item: VaultEncryptedItem,
): item is VaultEncryptedItem & {
  encryptedPayload: ArrayBuffer | ArrayBufferView
  iv: ArrayBuffer | ArrayBufferView
} => {
  return isByteSource(item.encryptedPayload) && isByteSource(item.iv)
}

const isVaultSecretRecord = (value: unknown): value is VaultSecretRecord => {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    isByteSource(value.credentialId) &&
    isByteSource(value.wrapSalt) &&
    isByteSource(value.wrappedVaultKey) &&
    isByteSource(value.wrappedVaultKeyIv) &&
    typeof value.keyVersion === 'number' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  )
}

const serializeVaultItem = (
  item: VaultEncryptedItem & {
    encryptedPayload: ArrayBuffer | ArrayBufferView
    iv: ArrayBuffer | ArrayBufferView
  },
): SerializedVaultItem => {
  return {
    id: item.id,
    encryptedPayload: bytesToBase64(toUint8Array(item.encryptedPayload)),
    iv: bytesToBase64(toUint8Array(item.iv)),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

const serializeVaultSecret = (secret: VaultSecretRecord): SerializedVaultSecret => {
  return {
    id: secret.id,
    credentialId: bytesToBase64(toUint8Array(secret.credentialId)),
    wrapSalt: bytesToBase64(toUint8Array(secret.wrapSalt)),
    wrappedVaultKey: bytesToBase64(toUint8Array(secret.wrappedVaultKey)),
    wrappedVaultKeyIv: bytesToBase64(toUint8Array(secret.wrappedVaultKeyIv)),
    keyVersion: secret.keyVersion,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  }
}

const serializeVaultEmbedding = (
  embedding: VaultEmbeddingRecord,
): SerializedVaultEmbedding => {
  return {
    noteId: embedding.noteId,
    vector: embedding.vector,
    model: embedding.model,
    updatedAt: embedding.updatedAt,
  }
}

const parseSerializedItem = (value: unknown): SerializedVaultItem => {
  if (!isObject(value)) {
    throw new Error('Backup file is invalid (item payload).')
  }

  return {
    id: ensureString(value.id, 'vault.items[].id'),
    encryptedPayload: ensureString(
      value.encryptedPayload,
      'vault.items[].encryptedPayload',
    ),
    iv: ensureString(value.iv, 'vault.items[].iv'),
    createdAt: ensureNumber(value.createdAt, 'vault.items[].createdAt'),
    updatedAt: ensureNumber(value.updatedAt, 'vault.items[].updatedAt'),
  }
}

const parseSerializedSecret = (value: unknown): SerializedVaultSecret => {
  if (!isObject(value)) {
    throw new Error('Backup file is invalid (secret payload).')
  }

  return {
    id: ensureString(value.id, 'vault.secret.id'),
    credentialId: ensureString(value.credentialId, 'vault.secret.credentialId'),
    wrapSalt: ensureString(value.wrapSalt, 'vault.secret.wrapSalt'),
    wrappedVaultKey: ensureString(
      value.wrappedVaultKey,
      'vault.secret.wrappedVaultKey',
    ),
    wrappedVaultKeyIv: ensureString(
      value.wrappedVaultKeyIv,
      'vault.secret.wrappedVaultKeyIv',
    ),
    keyVersion: ensureNumber(value.keyVersion, 'vault.secret.keyVersion'),
    createdAt: ensureNumber(value.createdAt, 'vault.secret.createdAt'),
    updatedAt: ensureNumber(value.updatedAt, 'vault.secret.updatedAt'),
  }
}

const parseSerializedEmbedding = (value: unknown): SerializedVaultEmbedding => {
  if (!isObject(value)) {
    throw new Error('Backup file is invalid (embedding payload).')
  }

  const rawVector = value.vector
  if (!Array.isArray(rawVector)) {
    throw new Error('Backup file is invalid (embedding vector missing).')
  }

  const vector = rawVector.map((entry, index) =>
    ensureNumber(entry, `vault.embeddings[].vector[${index}]`),
  )

  return {
    noteId: ensureString(value.noteId, 'vault.embeddings[].noteId'),
    vector,
    model: ensureString(value.model, 'vault.embeddings[].model'),
    updatedAt: ensureNumber(value.updatedAt, 'vault.embeddings[].updatedAt'),
  }
}

const toChecksumHex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(text))
  const bytes = new Uint8Array(digest)

  return [...bytes]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

const parseBackupEnvelope = async (
  value: unknown,
): Promise<SerializedBackupEnvelopeV2> => {
  if (!isObject(value)) {
    throw new Error('Backup file is invalid.')
  }

  const format = ensureString(value.format, 'format')
  const version = ensureNumber(value.version, 'version')
  const exportedAt = ensureNumber(value.exportedAt, 'exportedAt')

  if (format !== BACKUP_FORMAT) {
    throw new Error('Unsupported backup format.')
  }

  if (version !== BACKUP_VERSION && version !== LEGACY_BACKUP_VERSION) {
    throw new Error(`Unsupported backup version (${version}).`)
  }

  if (!isObject(value.vault)) {
    throw new Error('Backup file is invalid (vault payload missing).')
  }

  const rawItems = value.vault.items
  const rawSecret = value.vault.secret
  const rawEmbeddings = value.vault.embeddings

  if (!Array.isArray(rawItems)) {
    throw new Error('Backup file is invalid (vault items missing).')
  }

  const items = rawItems.map(parseSerializedItem)
  const secret = parseSerializedSecret(rawSecret)
  const embeddings = Array.isArray(rawEmbeddings)
    ? rawEmbeddings.map(parseSerializedEmbedding)
    : []

  const parsed: SerializedBackupEnvelopeV2 = {
    format: BACKUP_FORMAT,
    version,
    exportedAt,
    checksum:
      typeof value.checksum === 'string' && value.checksum.length > 0
        ? value.checksum
        : undefined,
    vault: {
      items,
      embeddings,
      secret,
    },
  }

  if (parsed.version === BACKUP_VERSION && parsed.checksum) {
    const canonicalText = JSON.stringify({
      ...parsed,
      checksum: undefined,
    })
    const expectedChecksum = await toChecksumHex(canonicalText)

    if (expectedChecksum !== parsed.checksum) {
      throw new Error('Backup checksum mismatch. File may be corrupted.')
    }
  }

  return parsed
}

const buildBackupPayload = async (
  sessionKey: CryptoKey,
): Promise<{
  payloadText: string
  itemCount: number
}> => {
  await migrateLegacyPlaintextNotes(sessionKey)

  const [rawItems, storedSecret, embeddings] = await Promise.all([
    db.vaultItems.toArray(),
    db.vaultSecrets.get(PRIMARY_SECRET_ID),
    db.vaultEmbeddings.toArray(),
  ])

  if (!storedSecret || !isVaultSecretRecord(storedSecret)) {
    throw new Error('Vault key metadata is missing. Configure passkey first.')
  }

  const encryptedItems = rawItems.filter(isEncryptedVaultItem)

  if (encryptedItems.length !== rawItems.length) {
    throw new Error('Backup failed: some vault items are not encrypted.')
  }

  const basePayload: SerializedBackupEnvelopeV2 = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    vault: {
      items: encryptedItems.map(serializeVaultItem),
      embeddings: embeddings.map(serializeVaultEmbedding),
      secret: serializeVaultSecret(storedSecret),
    },
  }

  const checksum = await toChecksumHex(JSON.stringify(basePayload))
  const payloadText = JSON.stringify({
    ...basePayload,
    checksum,
  })

  return {
    payloadText,
    itemCount: encryptedItems.length,
  }
}

const restoreBackupPayloadText = async (rawText: string): Promise<ParsedBackupResult> => {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Backup file is not valid JSON.')
  }

  const backup = await parseBackupEnvelope(parsed)

  const vaultItems: VaultEncryptedItem[] = backup.vault.items.map((item) => ({
    id: item.id,
    encryptedPayload: base64ToBytes(item.encryptedPayload),
    iv: base64ToBytes(item.iv),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))

  const secret: VaultSecretRecord = {
    id: backup.vault.secret.id,
    credentialId: base64ToBytes(backup.vault.secret.credentialId),
    wrapSalt: base64ToBytes(backup.vault.secret.wrapSalt),
    wrappedVaultKey: base64ToBytes(backup.vault.secret.wrappedVaultKey),
    wrappedVaultKeyIv: base64ToBytes(backup.vault.secret.wrappedVaultKeyIv),
    keyVersion: backup.vault.secret.keyVersion,
    createdAt: backup.vault.secret.createdAt,
    updatedAt: backup.vault.secret.updatedAt,
  }

  const embeddings: VaultEmbeddingRecord[] = (backup.vault.embeddings ?? []).map(
    (embedding) => ({
      noteId: embedding.noteId,
      vector: embedding.vector,
      model: embedding.model,
      updatedAt: embedding.updatedAt,
    }),
  )

  await db.transaction(
    'rw',
    db.vaultItems,
    db.vaultSecrets,
    db.vaultEmbeddings,
    async () => {
      await db.vaultItems.clear()
      await db.vaultItems.bulkPut(vaultItems)
      await db.vaultEmbeddings.clear()
      if (embeddings.length > 0) {
        await db.vaultEmbeddings.bulkPut(embeddings)
      }
      await db.vaultSecrets.clear()
      await db.vaultSecrets.put(secret)
    },
  )

  return {
    itemCount: vaultItems.length,
  }
}

const pruneOldSnapshots = async (): Promise<void> => {
  const snapshots = await db.backupSnapshots.orderBy('createdAt').reverse().toArray()
  const overflow = snapshots.slice(MAX_SNAPSHOTS)

  if (overflow.length === 0) {
    return
  }

  await db.backupSnapshots.bulkDelete(overflow.map((snapshot) => snapshot.id))
}

export async function exportEncryptedVaultBackup(
  sessionKey: CryptoKey,
): Promise<{
  blob: Blob
  filename: string
  itemCount: number
}> {
  const payload = await buildBackupPayload(sessionKey)

  return {
    blob: new Blob([payload.payloadText], {
      type: 'application/octet-stream',
    }),
    filename: BACKUP_FILENAME,
    itemCount: payload.itemCount,
  }
}

export async function createBackupSnapshot(
  sessionKey: CryptoKey,
  source: 'auto' | 'manual',
): Promise<BackupSnapshotSummary> {
  const payload = await buildBackupPayload(sessionKey)
  const now = Date.now()
  const snapshot: VaultBackupSnapshotRecord = {
    id: crypto.randomUUID(),
    payload: textEncoder.encode(payload.payloadText),
    source,
    itemCount: payload.itemCount,
    createdAt: now,
  }

  await db.backupSnapshots.put(snapshot)
  await pruneOldSnapshots()

  return {
    id: snapshot.id,
    source: snapshot.source,
    itemCount: snapshot.itemCount,
    createdAt: snapshot.createdAt,
  }
}

export async function listBackupSnapshots(
  limit = MAX_SNAPSHOTS,
): Promise<BackupSnapshotSummary[]> {
  const snapshots = await db.backupSnapshots
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray()

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    source: snapshot.source,
    itemCount: snapshot.itemCount,
    createdAt: snapshot.createdAt,
  }))
}

export async function restoreBackupSnapshot(
  snapshotId: string,
): Promise<ParsedBackupResult> {
  const snapshot = await db.backupSnapshots.get(snapshotId)

  if (!snapshot) {
    throw new Error('Snapshot not found.')
  }

  const rawText = textDecoder.decode(snapshot.payload)

  return restoreBackupPayloadText(rawText)
}

export async function importEncryptedVaultBackup(file: File): Promise<ParsedBackupResult> {
  let rawText = ''

  try {
    rawText = await file.text()
  } catch {
    throw new Error('Unable to read backup file.')
  }

  return restoreBackupPayloadText(rawText)
}
