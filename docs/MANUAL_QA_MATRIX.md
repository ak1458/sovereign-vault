# Manual QA Matrix

Date: February 18, 2026
Scope: Passkey, backup, PWA install/offline, and category flows.

## Browsers
- Chrome Stable (Windows)
- Edge Stable (Windows)

## Environment Preconditions
- HTTPS context or localhost
- Platform authenticator available (Windows Hello)
- Fresh profile for first-run setup test

## Test Cases

1. First-run passkey setup
- Open app with empty IndexedDB.
- Click `Create Passkey`.
- Complete biometric prompt.
- Expected: session unlocks and vault becomes usable.

2. Lock/unlock loop
- Create one note.
- Click `Lock`.
- Click `Unlock Vault` and authenticate.
- Expected: note list decrypts correctly after unlock.

3. Auto-lock inactivity
- Unlock vault.
- Wait for configured inactivity window (3 minutes).
- Expected: app returns to locked state.

4. Category flows
- Create one item for each category: note/document/password/card.
- Filter by each category chip.
- Expected: only matching items appear.

5. Search behavior
- In category `all`, type keyword search and confirm results.
- Toggle semantic search in AI tab and search again.
- Expected: results remain relevant and app stays responsive.

6. Backup export/import
- Export backup file.
- Add another note.
- Import exported file and confirm overwrite.
- Expected: vault restores to exported state.

7. Snapshot restore
- Create snapshot.
- Modify a note.
- Restore snapshot.
- Expected: pre-modification content is restored.

8. PWA install
- Trigger `Install App` from Security tab.
- Accept prompt.
- Relaunch installed app window.
- Expected: app runs in standalone window.

9. Offline relaunch
- Open installed app.
- Disable network.
- Relaunch app.
- Expected: app loads and existing local data is accessible.

10. Data-loss warning visibility
- Open Security and Backup tabs.
- Expected: unrecoverable-data warnings are visible and clear.

## Result Template
- Browser:
- Case:
- Result: Pass/Fail
- Notes:
- Screenshot/recording reference:
