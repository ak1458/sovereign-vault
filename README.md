# SovereignVault

[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Web Crypto](https://img.shields.io/badge/Web%20Crypto-AES--GCM-critical)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-active-success)

Local-first privacy vault built with React, TypeScript, Dexie, and Web Crypto.

SovereignVault runs as a browser app and installable PWA. Notes are encrypted before storage, the vault key is passkey-wrapped, and backups stay local and encrypted.

## Current Status

Execution roadmap is implemented through Week 12 baseline (foundation, reliability, AI baseline, and launch docs).

## Core Features

- Local encrypted notes (AES-GCM)
- Structured vault categories (`note`, `document`, `password`, `card`)
- Cognitive Mirror dashboard:
  - weekly thinking themes
  - repeating ideas
  - abandoned project signals
  - focus drift detection
- Platform passkey setup/unlock flow
- In-memory session key with inactivity auto-lock
- Dexie/IndexedDB storage
- Encrypted backup export/import with checksum validation
- Local snapshot creation and restore
- Optional semantic search and note summaries (worker-based)
- Installable offline PWA

## Stack

- React + Vite + TypeScript
- React Router
- Tailwind CSS
- Dexie + IndexedDB
- Web Crypto API
- WebAuthn passkeys
- Vitest + fake-indexeddb

## Project Structure

- `src/core`: platform-agnostic vault domain helpers
- `src/storage`: browser storage adapters
- `src/features/vault`: session, CRUD, encryption-backed vault flows
- `src/features/backup`: backup export/import + snapshots
- `src/features/ai`: embedding/summary controls + worker client
- `src/workers`: AI worker runtime
- `src/lib`: crypto, passkey, db primitives

## Run

```bash
npm install
npm run dev
```

Default dev URL: `http://127.0.0.1:5173`

## Quality Checks

```bash
npm run lint
npm run test:run
npm run build
```

## Security Notes

- Plaintext note payloads are not persisted in normal flows.
- Raw vault key is not stored at rest.
- If passkey + device + backups are all lost, recovery is impossible.

See:

- `docs/ARCHITECTURE.md`
- `docs/THREAT_MODEL.md`
- `docs/SECURITY_AUDIT_PREP.md`
- `docs/LAUNCH_PLAYBOOK.md`
- `docs/PERFORMANCE_NOTES.md`
- `docs/MANUAL_QA_MATRIX.md`
- `docs/RELEASE_NOTES_v0.2.md`

## MVP Boundaries

- No server dependency for core operation.
- No cloud backup integration in this scope.
- Desktop-first UX; mobile polish can iterate later.

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
