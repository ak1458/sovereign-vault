# Release Notes Draft v0.2

Date: February 18, 2026

## Highlights
- Local-first encrypted vault with passkey unlock.
- Structured categories: notes, documents, passwords, cards.
- Local encrypted backup export/import with checksum integrity checks.
- Local snapshot creation and restore.
- Optional local AI semantic search and summarization.
- Installable offline PWA experience.

## Improvements
- Added virtualized note rendering for large vault performance.
- Added debounced search to reduce UI churn while typing.
- Strengthened cross-realm byte handling in vault/backup paths.
- Added regression tests for crypto wrapping and checksum tamper rejection.

## Verification
- Lint: pass
- Build: pass
- Tests: pass

## Known Limits
- Cloud backup providers are not included in this release.
- Manual browser QA matrix should be run before broad public distribution.
