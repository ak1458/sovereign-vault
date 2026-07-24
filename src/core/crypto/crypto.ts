const encoder = new TextEncoder()
const decoder = new TextDecoder()

const AES_GCM_IV_LENGTH = 12
const HKDF_INFO_CONTEXT = encoder.encode('SovereignVault::HKDF::KeyWrapping::v2')
const LEGACY_WRAP_KEY_CONTEXT = encoder.encode('SovereignVault::WrapKey::v1')

export class CryptographicError extends Error {
  readonly code: string

  constructor(message: string, code = 'CRYPTO_ERROR') {
    super(message)
    this.name = 'CryptographicError'
    this.code = code
  }
}

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

/**
 * Constant-time byte comparison to prevent timing side-channel attacks.
 */
export function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.byteLength; i++) {
    result |= a[i] ^ b[i]
  }

  return result === 0
}

/**
 * Zeroize sensitive memory buffers to prevent heap leakage.
 */
export function zeroizeBytes(bytes: Uint8Array): void {
  try {
    crypto.getRandomValues(bytes)
  } catch {
    // Fallback if crypto unavailable
  } finally {
    bytes.fill(0)
  }
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
  try {
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
    const jsonString = JSON.stringify(payload)
    const plaintext = encoder.encode(jsonString)
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext,
    )

    zeroizeBytes(plaintext)

    return {
      iv,
      encryptedPayload: new Uint8Array(encryptedBuffer),
    }
  } catch (error) {
    throw new CryptographicError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ENCRYPTION_FAILED',
    )
  }
}

export async function decryptJsonPayload<T>(
  key: CryptoKey,
  iv: Uint8Array,
  encryptedPayload: Uint8Array,
): Promise<T> {
  try {
    const ivBytes = new Uint8Array(iv)
    const payloadBytes = new Uint8Array(encryptedPayload)
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      payloadBytes,
    )
    const plaintextBytes = new Uint8Array(decryptedBuffer)
    const plaintext = decoder.decode(plaintextBytes)
    const result = JSON.parse(plaintext) as T

    zeroizeBytes(plaintextBytes)

    return result
  } catch {
    throw new CryptographicError(
      'Decryption failed. The encryption key or ciphertext may be corrupted or invalid.',
      'DECRYPTION_FAILED',
    )
  }
}

/**
 * Generates a cryptographically strong random salt.
 */
export function generateSalt(byteLength = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(byteLength))
}

/**
 * Derives a key wrapping key from a user PIN/Passcode using PBKDF2-SHA256 (100,000 iterations).
 */
export async function deriveWrappingKeyFromPin(
  pin: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const pinBytes = encoder.encode(pin)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    toSafeArrayBuffer(pinBytes),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toSafeArrayBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

/**
 * Web3 Standard HKDF-SHA256 Key Derivation from PRF secret with domain separation.
 */
export async function deriveWrappingKeyFromPrfSecret(
  prfSecret: Uint8Array,
  salt?: Uint8Array,
): Promise<CryptoKey> {
  try {
    const prfKeyMaterial = await crypto.subtle.importKey(
      'raw',
      toSafeArrayBuffer(prfSecret),
      { name: 'HKDF' },
      false,
      ['deriveKey'],
    )

    const effectiveSalt = salt ?? new Uint8Array(32)

    return await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: toSafeArrayBuffer(effectiveSalt),
        info: HKDF_INFO_CONTEXT,
      },
      prfKeyMaterial,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['wrapKey', 'unwrapKey'],
    )
  } catch {
    // Fallback to legacy SHA-256 digest for backwards compatibility if HKDF unsupported
    const keyMaterial = concatBytes([prfSecret, LEGACY_WRAP_KEY_CONTEXT])
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
}

/**
 * Legacy key derivation fallback to decrypt existing wrapped keys from v1 schema.
 */
export async function deriveLegacyWrappingKey(
  prfSecret: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = concatBytes([prfSecret, LEGACY_WRAP_KEY_CONTEXT])
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
  try {
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
  } catch (error) {
    throw new CryptographicError(
      `Key wrapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'KEY_WRAP_FAILED',
    )
  }
}

export async function unwrapVaultKey(
  wrappedVaultKey: Uint8Array,
  wrappedVaultKeyIv: Uint8Array,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  try {
    const wrappedKeyBuffer = toSafeArrayBuffer(wrappedVaultKey)
    const iv = new Uint8Array(wrappedVaultKeyIv)

    return await crypto.subtle.unwrapKey(
      'raw',
      wrappedKeyBuffer,
      wrappingKey,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    )
  } catch {
    throw new CryptographicError(
      'Key unwrapping failed. Authentication credential or wrapping key is invalid.',
      'KEY_UNWRAP_FAILED',
    )
  }
}

/**
 * Computes SHA-256 HMAC for data authentication and tampering detection.
 */
export async function computeHmacSha256(
  secretKeyBytes: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    toSafeArrayBuffer(secretKeyBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    toSafeArrayBuffer(data),
  )

  return new Uint8Array(signature)
}
