const PASSKEY_TIMEOUT_MS = 60_000
const CHALLENGE_BYTES = 32
const USER_ID_BYTES = 32
const WRAP_SALT_BYTES = 32

export interface PasskeyRegistration {
  credentialId: Uint8Array
  wrapSalt: Uint8Array
}

interface PrfExtensionClientOutput {
  prf?: {
    enabled?: boolean
    results?: {
      first?: ArrayBuffer
    }
  }
}

const toUint8Array = (buffer: ArrayBuffer): Uint8Array => {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(new Uint8Array(buffer))
  return copy
}

const toSafeArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

const randomBytes = (byteLength: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(byteLength))
}

export async function isPasskeySupported(): Promise<boolean> {
  if (!window.isSecureContext || !window.PublicKeyCredential) {
    return false
  }

  if (
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !==
    'function'
  ) {
    return false
  }

  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}

export async function registerPlatformPasskey(
  displayName: string,
): Promise<PasskeyRegistration> {
  const supported = await isPasskeySupported()
  if (!supported) {
    throw new Error('Platform passkeys are unavailable in this browser.')
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: toSafeArrayBuffer(randomBytes(CHALLENGE_BYTES)),
      rp: {
        name: 'SovereignVault',
      },
      user: {
        id: toSafeArrayBuffer(randomBytes(USER_ID_BYTES)),
        name: `vault-owner-${Date.now()}`,
        displayName,
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: PASSKEY_TIMEOUT_MS,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: {
        prf: {},
      } as AuthenticationExtensionsClientInputs,
    },
  })

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('Passkey registration did not return a credential.')
  }

  return {
    credentialId: toUint8Array(credential.rawId),
    wrapSalt: randomBytes(WRAP_SALT_BYTES),
  }
}

export async function getPasskeyPrfSecret(
  credentialId: Uint8Array,
  wrapSalt: Uint8Array,
): Promise<Uint8Array> {
  const supported = await isPasskeySupported()
  if (!supported) {
    throw new Error('Platform passkeys are unavailable in this browser.')
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: toSafeArrayBuffer(randomBytes(CHALLENGE_BYTES)),
      allowCredentials: [
        {
          id: toSafeArrayBuffer(credentialId),
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: PASSKEY_TIMEOUT_MS,
      extensions: {
        prf: {
          eval: { first: toSafeArrayBuffer(wrapSalt) },
        },
      } as AuthenticationExtensionsClientInputs,
    },
  })

  if (!(assertion instanceof PublicKeyCredential)) {
    throw new Error('Passkey authentication did not return an assertion.')
  }

  const extensionResult =
    assertion.getClientExtensionResults() as PrfExtensionClientOutput
  const prfSecretBuffer = extensionResult.prf?.results?.first

  if (!prfSecretBuffer) {
    throw new Error(
      'Passkey PRF extension is unavailable. Use a browser/device that supports it.',
    )
  }

  return toUint8Array(prfSecretBuffer)
}
