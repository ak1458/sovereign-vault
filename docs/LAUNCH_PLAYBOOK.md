# Launch Playbook

## Release Goal
Ship a credible local-first privacy vault baseline (v0.2) with:
- secure local storage
- passkey unlock
- encrypted backup and restore
- PWA install/offline support
- optional local AI helpers

## Pre-Launch Checklist
1. Run quality gates:
- `npm run lint`
- `npm run test:run`
- `npm run build`

2. Manual validation:
- Fresh setup (new passkey)
- Lock/unlock cycle
- Create/update/delete notes
- Export/import backup roundtrip
- Snapshot create/restore roundtrip
- PWA install and relaunch offline

3. Release package:
- Update README and docs links
- Capture demo video
- Prepare launch post copy

## Demo Video Script (5-7 minutes)
1. Introduce local-first and zero-knowledge positioning.
2. Show first-run passkey setup.
3. Create two secure notes.
4. Show lock/unlock flow.
5. Show semantic search and summary toggle.
6. Export backup, clear data, import backup.
7. Show PWA install and offline behavior.
8. Close with risk model and roadmap.

## Suggested Launch Channels
- GitHub release notes
- Dev.to post focused on architecture and threat model
- Reddit privacy/self-hosted communities (respect subreddit rules)

## Feedback Intake Plan
- Track issues by label: `bug`, `security`, `ux`, `feature`.
- Prioritize by severity:
- P0: data loss/security
- P1: unlock/backup breakage
- P2: UX/performance polish

## Post-Launch Week 1 Actions
1. Triage all user-reported issues within 24h.
2. Patch P0/P1 issues before feature additions.
3. Publish a changelog update with fixed defects.
