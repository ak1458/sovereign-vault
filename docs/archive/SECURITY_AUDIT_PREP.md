# Security Audit Preparation

## Crypto Inventory
- Algorithm: AES-GCM 256 for note payload encryption.
- IV length: 12 bytes random per encryption operation.
- Wrap key derivation: SHA-256(PRF secret || context string).
- Wrap/unwrap operations: Web Crypto `wrapKey` / `unwrapKey` with AES-GCM.

## Key Handling Rules
- Vault key generated client-side.
- Vault key stored only as wrapped bytes.
- Wrapped key metadata stored in `vaultSecrets` (`primary` record).
- Session key kept in memory only while unlocked.
- Auto-lock timeout clears session key.

## Passkey Expectations
- Platform authenticator required.
- PRF extension required for wrap key derivation.
- Setup and unlock paths fail closed when unsupported.

## Backup Integrity Controls
- Backup payload includes format and version.
- Version 2 backups include SHA-256 checksum.
- Import rejects checksum mismatch.
- Restore runs in IndexedDB transaction to avoid partial states.

## Data Validation Controls
- Backup import validates object shapes and required fields.
- Byte coercion handles ArrayBuffer and ArrayBufferView safely.
- Invalid/malformed records fail with explicit errors.

## Test Coverage Summary
Automated:
- `src/lib/crypto.test.ts`
- `src/features/vault/vault.service.test.ts`
- `src/features/backup/backup.service.test.ts`
- `src/features/ai/vector.test.ts`

Static/build:
- `npm run lint`
- `npm run build`

## Audit Checklist
1. Verify no plaintext fields are written to IndexedDB in normal flows.
2. Verify `vaultSecrets` never stores raw key material.
3. Verify backup import rejects tampered checksum.
4. Verify lock event clears in-memory key references.
5. Verify passkey setup/unlock failure paths do not leave unlocked state.
6. Verify service worker disabled in dev and enabled in prod.
7. Verify destructive restore/import always requires explicit confirmation.

## Open Security TODOs
- Add optional authenticated export passphrase layer for backups.
- Add formal cryptography review from third-party expert.
- Add browser matrix regression run for passkey PRF behavior.
