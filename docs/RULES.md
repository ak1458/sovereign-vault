# Security, Privacy & Architectural Rules (RULES.md)

## Project: SovereignVault
**Enforcement Level:** Mandatory  

---

## Rule 1: Zero-Knowledge Disk Principle
> **Plaintext content MUST NEVER be written to IndexedDB, LocalStorage, SessionStorage, or disk storage.**
- All vault data must be serialized to JSON and encrypted via AES-GCM before database write operations.
- Plaintext objects are retained in React component state only for active viewing/editing and cleared upon vault lock.

## Rule 2: Web Crypto Key Isolation
> **Encryption keys MUST NOT be stored raw in storage or transmitted over network.**
- Unwrapped `CryptoKey` handles exist only in memory during active unlocked sessions.
- Storage of wrapped keys requires WebAuthn PRF or PBKDF2 salt derivation.

## Rule 3: Input Sanitization & Type Boundaries
> **All external and user-provided inputs MUST be sanitized before processing.**
- Strings must be trimmed and stripped of unsafe HTML tags.
- Vault categories must be validated against `['note', 'document', 'password', 'card']`.

## Rule 4: File Import Safety
> **Untrusted backup files MUST NOT be parsed without format verification.**
- Max file size limit: 50MB.
- Binary structure and schema version checks must precede JSON parsing and decryption.

## Rule 5: Error Isolation & Privacy Leakage Prevention
> **Internal system exceptions, stack traces, and database errors MUST NOT be displayed to the user UI.**
- Wrap all top-level features in ErrorBoundaries.
- Map internal exceptions to clean, localized user notifications.

## Rule 6: Zero Telemetry & Third-Party Leakage
> **No tracking scripts, analytics SDKs, or background ping servers allowed.**
- SovereignVault operates 100% offline-first.
