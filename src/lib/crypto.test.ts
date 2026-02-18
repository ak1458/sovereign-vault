import { describe, expect, it } from 'vitest'
import {
  decryptJsonPayload,
  deriveWrappingKeyFromPrfSecret,
  encryptJsonPayload,
  generateVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
} from './crypto'

describe('crypto', () => {
  it('encrypts and decrypts JSON payload', async () => {
    const key = await generateVaultKey()
    const source = {
      title: 'Hello',
      content: 'Encrypted world',
      tags: ['x', 'y'],
    }

    const encrypted = await encryptJsonPayload(key, source)
    const decrypted = await decryptJsonPayload<typeof source>(
      key,
      encrypted.iv,
      encrypted.encryptedPayload,
    )

    expect(decrypted).toEqual(source)
  })

  it('wraps and unwraps vault key', async () => {
    const vaultKey = await generateVaultKey()
    const prfSecret = crypto.getRandomValues(new Uint8Array(32))
    const wrappingKey = await deriveWrappingKeyFromPrfSecret(prfSecret)
    expect(wrappingKey.usages).toContain('wrapKey')
    expect(wrappingKey.usages).toContain('unwrapKey')
    const wrapped = await wrapVaultKey(vaultKey, wrappingKey)

    const unwrapped = await unwrapVaultKey(
      wrapped.wrappedVaultKey,
      wrapped.wrappedVaultKeyIv,
      wrappingKey,
    )

    const payload = { message: 'roundtrip' }
    const encrypted = await encryptJsonPayload(unwrapped, payload)
    const decrypted = await decryptJsonPayload<typeof payload>(
      unwrapped,
      encrypted.iv,
      encrypted.encryptedPayload,
    )

    expect(decrypted).toEqual(payload)
  })
})
