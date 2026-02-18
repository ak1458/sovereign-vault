const encoder = new TextEncoder()
const decoder = new TextDecoder()

const AES_GCM_IV_LENGTH = 12
const WRAP_KEY_CONTEXT = encoder.encode('SovereignVault::WrapKey::v1')

export interface EncryptedPayload {
  iv: Uint8Array
  encryptedPayload: Uint8Array
}

export interface WrappedVaultKey {
  wrappedVaultKey: Uint8Array
  wrappedVaultKeyIv: Uint8Array
}

const toSafeArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

const concatBytes = (parts: Uint8Array[]): Uint8Array => {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const output = new Uint8Array(totalLength)

  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }

  return output
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJsonPayload<T>(
  key: CryptoKey,
  payload: T,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
  const plaintext = encoder.encode(JSON.stringify(payload))
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  )

  return {
    iv,
    encryptedPayload: new Uint8Array(encryptedBuffer),
  }
}

export async function decryptJsonPayload<T>(
  key: CryptoKey,
  iv: Uint8Array,
  encryptedPayload: Uint8Array,
): Promise<T> {
  const ivBytes = new Uint8Array(iv)
  const payloadBytes = new Uint8Array(encryptedPayload)
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    payloadBytes,
  )
  const plaintext = decoder.decode(decryptedBuffer)

  return JSON.parse(plaintext) as T
}

export async function deriveWrappingKeyFromPrfSecret(
  prfSecret: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = concatBytes([prfSecret, WRAP_KEY_CONTEXT])
  const digest = await crypto.subtle.digest(
    'SHA-256',
    toSafeArrayBuffer(keyMaterial),
  )

  return crypto.subtle.importKey(
    'raw',
    digest,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<WrappedVaultKey> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
  const wrappedBuffer = await crypto.subtle.wrapKey(
    'raw',
    vaultKey,
    wrappingKey,
    { name: 'AES-GCM', iv },
  )

  return {
    wrappedVaultKey: new Uint8Array(wrappedBuffer),
    wrappedVaultKeyIv: iv,
  }
}

export async function unwrapVaultKey(
  wrappedVaultKey: Uint8Array,
  wrappedVaultKeyIv: Uint8Array,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const wrappedKeyBuffer = toSafeArrayBuffer(wrappedVaultKey)
  const iv = new Uint8Array(wrappedVaultKeyIv)

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    wrappingKey,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}
