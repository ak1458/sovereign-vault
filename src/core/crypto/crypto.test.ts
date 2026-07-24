import { describe, expect, it } from 'vitest'
import {
  computeHmacSha256,
  constantTimeCompare,
  decryptJsonPayload,
  deriveWrappingKeyFromPrfSecret,
  encryptJsonPayload,
  generateVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
  zeroizeBytes,
} from './crypto'

describe('Web3 Cryptographic Core Tests', () => {
  it('encrypts and decrypts JSON payload using AES-256-GCM', async () => {
    const key = await generateVaultKey()
    const source = {
      title: 'Zero-Knowledge Vault',
      content: 'Top secret cognitive entry',
      tags: ['security', 'web3'],
    }

    const encrypted = await encryptJsonPayload(key, source)
    const decrypted = await decryptJsonPayload<typeof source>(
      key,
      encrypted.iv,
      encrypted.encryptedPayload,
    )

    expect(decrypted).toEqual(source)
  })

  it('derives wrapping key via HKDF-SHA256 and wraps/unwraps vault key', async () => {
    const vaultKey = await generateVaultKey()
    const prfSecret = crypto.getRandomValues(new Uint8Array(32))
    const salt = crypto.getRandomValues(new Uint8Array(32))
    const wrappingKey = await deriveWrappingKeyFromPrfSecret(prfSecret, salt)

    expect(wrappingKey.usages).toContain('wrapKey')
    expect(wrappingKey.usages).toContain('unwrapKey')

    const wrapped = await wrapVaultKey(vaultKey, wrappingKey)

    const unwrapped = await unwrapVaultKey(
      wrapped.wrappedVaultKey,
      wrapped.wrappedVaultKeyIv,
      wrappingKey,
    )

    const payload = { message: 'HKDF roundtrip successful' }
    const encrypted = await encryptJsonPayload(unwrapped, payload)
    const decrypted = await decryptJsonPayload<typeof payload>(
      unwrapped,
      encrypted.iv,
      encrypted.encryptedPayload,
    )

    expect(decrypted).toEqual(payload)
  })

  it('performs constant-time byte comparisons to mitigate timing side-channels', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5])
    const b = new Uint8Array([1, 2, 3, 4, 5])
    const c = new Uint8Array([1, 2, 3, 4, 6])
    const d = new Uint8Array([1, 2, 3, 4])

    expect(constantTimeCompare(a, b)).toBe(true)
    expect(constantTimeCompare(a, c)).toBe(false)
    expect(constantTimeCompare(a, d)).toBe(false)
  })

  it('zeroizes sensitive byte arrays in memory', () => {
    const sensitive = new Uint8Array([10, 20, 30, 40, 50])
    zeroizeBytes(sensitive)
    expect(sensitive.every((b) => b === 0)).toBe(true)
  })

  it('computes HMAC-SHA256 for tamper detection', async () => {
    const secret = new Uint8Array(32).fill(7)
    const data = new TextEncoder().encode('Vault Snapshot Contents')

    const signature1 = await computeHmacSha256(secret, data)
    const signature2 = await computeHmacSha256(secret, data)

    expect(signature1).toEqual(signature2)
    expect(signature1.byteLength).toBe(32)
  })
})
