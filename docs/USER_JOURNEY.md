# App Flow & User Journey Specification

## Project: SovereignVault
**Document:** User Experience, Navigation State Machine & Security Transitions  

---

## 1. Complete Application Flow Diagram

```
                       +-------------------+
                       | App Initialization|
                       +-------------------+
                                 |
                                 v
                       +-------------------+
                       | Passkey Check     |
                       +-------------------+
                         /               \
            (Not Configured)             (Configured)
                       /                   \
                      v                     v
          +----------------------+   +----------------------+
          | Passkey Setup Screen |   | PIN / Passkey Unlock |
          +----------------------+   +----------------------+
                      |                         |
               (Passkey Created)        (Authenticated)
                      \                         /
                       v                       v
          +-------------------------------------------------+
          |                UNLOCKED VAULT                   |
          |  State: Memory key active | Auto-lock timer ON  |
          +-------------------------------------------------+
               /               |             |          \
              v                v             v           v
       +------------+    +------------+ +----------+ +------------+
       | Home Panel |    | Search Tab | | Insights | | Settings   |
       | - Quick +  |    | - Filter   | | - Cognitive| - Backup/  |
       | - Recents  |    | - Vector AI| |   Mirror | |   Restore  |
       +------------+    +------------+ +----------+ +------------+
             \                 /
              v               v
       +------------------------------------+
       |         Note Detail / Editor       |
       | - Auto-save | AI Summary Drawer    |
       +------------------------------------+
```

---

## 2. Detailed User Journey Steps

### Journey 1: First-Time Onboarding & Passkey Creation
1. User navigates to SovereignVault app.
2. System initializes WebAuthn capability check.
3. System presents "Set Up Secure Access" screen.
4. User taps "Create Passkey" -> Browser prompts biometrics (FaceID / Fingerprint / Windows Hello).
5. App generates random 256-bit VEK in memory, wraps it using PRF credentials, and saves secret payload to `vaultSecrets`.
6. User enters unlocked vault directly.

### Journey 2: Returning User Lock & Unlock Flow
1. User opens app or returns after inactivity.
2. Session state is `locked`. Key is purged from memory.
3. App presents PIN / Fingerprint unlock screen.
4. User taps Fingerprint icon / enters PIN.
5. Biometric check succeeds -> System unwraps VEK into memory.
6. Main UI reveals user notes seamlessly.

### Journey 3: Searching & Viewing Pattern Insights
1. User switches to "Search" tab.
2. User types a query (e.g. "productivity ideas").
3. Local AI engine generates vector embedding locally in Web Worker.
4. System ranks notes via cosine similarity search across encrypted embeddings.
5. User views top matching notes.
6. User switches to "Insights" tab -> App calculates repeating topics, focus drift, and abandoned project insights.

### Journey 4: Encrypted Backup & Device Recovery
1. User navigates to "Settings" tab.
2. User taps "Export Encrypted Backup".
3. System reads all encrypted items + wrapped secret and generates `.vlt` file download.
4. On a new device, user taps "Restore Vault", selects `.vlt` backup file, and authenticates.
5. All notes restore securely with 0 server involvement.
