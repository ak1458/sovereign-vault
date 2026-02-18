# SovereignVault Threat Model

## Security Goals
- Plaintext notes are never persisted to IndexedDB.
- Vault key is never stored raw at rest.
- Unlock requires platform passkey interaction.
- Backups are integrity-checked before restore.

## Protected Assets
- Note plaintext
- Vault encryption key
- Wrapped key material + passkey metadata
- Backup snapshot payloads

## Assumed Attacker Capabilities
- Reads local storage files or IndexedDB dumps.
- Tries to import tampered backup files.
- Has temporary physical access to unlocked device.
- Can run browser extensions in user context (high risk).

## Out of Scope
- Compromised OS/kernel.
- Hardware-level attacks.
- Browser zero-day compromise.
- Shoulder surfing / social engineering.

## Threats and Mitigations
1. IndexedDB exfiltration
- Mitigation: AES-GCM encrypted note payloads, wrapped vault key only.

2. Raw vault key persistence
- Mitigation: in-memory key only; auto-lock clears session key.

3. Forged/tampered backup import
- Mitigation: backup schema checks + SHA-256 checksum verification.

4. Legacy plaintext records from early schema versions
- Mitigation: migration path encrypts legacy records when detected.

5. UI thread freeze during AI operations
- Mitigation: worker-based embedding/summary pipeline.

6. Passkey PRF unsupported environment
- Mitigation: explicit setup/unlock failures with user-facing messages.

## Residual Risks
- If device is compromised while vault is unlocked, plaintext in memory can be exposed.
- Browser extension abuse can capture user input.
- Lost passkey + lost backups means unrecoverable data.

## Operational Recommendations
- Keep auto-lock enabled.
- Export backups frequently and store copies offline.
- Use OS-level full-disk encryption.
- Use a dedicated browser profile for the vault app.

## Validation Artifacts
Current automated checks:
- Crypto roundtrip and key wrap/unwrap tests
- Vault CRUD + embedding tests
- Backup export/import + checksum tamper tests

Manual checks required before release:
- Passkey behavior on Chrome/Edge stable
- PWA install/uninstall behavior
- Backup restore from old and new files
