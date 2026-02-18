# SovereignVault Architecture

## Scope
This document describes the current browser-first architecture implemented through Week 12 of the execution plan.

## High-Level Design
SovereignVault is a local-first encrypted notes vault that runs entirely in the browser as a PWA.

- UI layer: React + React Router + Tailwind
- Local data layer: Dexie over IndexedDB
- Crypto/session layer: Web Crypto + platform passkeys
- AI layer: Worker-based local embedding and summary logic
- Backup layer: local encrypted export/import + local snapshots
- Offline layer: service worker + installable PWA shell

No application server is required for core usage.

## Data Stores
IndexedDB database: `sovereign_vault`

Tables:
- `vaultItems`: encrypted note payloads (`iv`, `encryptedPayload`, metadata)
- `vaultSecrets`: passkey-wrapped vault key metadata (`primary` record)
- `vaultEmbeddings`: semantic search vectors
- `backupSnapshots`: local snapshot payloads and metadata

## Security and Session Flow
1. App checks passkey support.
2. First-time setup registers a platform passkey and derives a PRF secret.
3. PRF secret is hashed and imported as a wrapping key.
4. Vault key is wrapped and stored; raw vault key is kept in memory only when unlocked.
5. Auto-lock clears in-memory key after inactivity.

## Note Lifecycle
Create/update:
1. Normalize draft (title/content/tags).
2. Encrypt payload with AES-GCM vault key.
3. Store encrypted bytes in `vaultItems`.
4. Optionally upsert embedding vector in `vaultEmbeddings`.

Read/list:
1. Load encrypted records from IndexedDB.
2. Decrypt in memory only for records being rendered.
3. Render decrypted notes in UI.

Delete:
1. Remove note record.
2. Remove embedding record in same transaction.

## Search Modes
- Keyword mode: decrypt-and-filter in memory.
- Semantic mode: embed query, rank with cosine similarity over stored vectors, then decrypt only ranked results.

## Backup Architecture
Export:
- Serializes encrypted notes, wrapped key metadata, and embeddings.
- Adds backup format/version metadata.
- Adds SHA-256 checksum for tamper detection.

Import/restore:
- Validates format/version.
- Verifies checksum (v2 backups).
- Replaces local vault tables in a transaction.
- Requires re-unlock in UI for session safety.

## Worker Model
AI operations run in `ai.worker.ts` to avoid blocking the UI thread.

- `embed`: deterministic hash embedding baseline
- `summarize`: lightweight heuristic summarizer baseline

## PWA Model
- Service worker registration in production only.
- Dev mode auto-unregisters stale workers.
- Install prompt support via `beforeinstallprompt` handling.

## Trust Boundaries
- Trusted: user device/browser runtime.
- Untrusted: imported backup files until validated.
- Out of scope: remote multi-device sync and server-side key custody.

## Known Limits
- No cloud sync in MVP.
- AI models are local baseline implementations (not ONNX yet).
- Recovery is impossible if passkey + device + backups are all lost.
