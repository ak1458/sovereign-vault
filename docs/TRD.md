# Technical Requirements Document (TRD)

## Project: SovereignVault
**Architecture Spec:** Local-First Web Crypto + IndexedDB + Web Worker Execution Engine  

---

## 1. System Architecture Diagram

```
+-------------------------------------------------------------------+
|                        Mobile Native App                          |
|    (Capacitor Android / iOS Runtime + Native Haptic & Biometrics)  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                           UI Layer                                |
|   (React 19 + TypeScript + Minimal Native Glass CSS System)       |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                       State & Logic Hooks                         |
|   (useVaultSession, useVaultNotes, useVaultInsights, useBackup)   |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                        Security Layer                             |
|   - Web Crypto API (AES-GCM 256-bit, IV=96-bit)                   |
|   - WebAuthn PRF Key Wrapping & Derivation                        |
|   - In-Memory Key Lifecycle & Auto-Zeroization                    |
+-------------------------------------------------------------------+
          |                                       |
          v                                       v
+------------------------+              +---------------------------+
|    Storage Layer       |              |        AI Worker          |
| (IndexedDB via Dexie)  |              | (ONNX Runtime Web Worker) |
| - Encrypted Items      |              | - Local Vector Embedding  |
| - Encrypted Secrets    |              | - Cosine Similarity Rank  |
| - Encrypted Snapshots  |              +---------------------------+
+------------------------+
```

---

## 2. Cryptographic Implementation Details

### 2.1 Encryption Standard
- **Cipher Algorithm**: AES-GCM (Galois/Counter Mode) with 256-bit key length.
- **Initialization Vector (IV)**: Cryptographically uniform random 96-bit (12-byte) IV generated per item write using `crypto.getRandomValues()`.
- **Key Wrapping**: Primary 256-bit Vault Encryption Key (VEK) is wrapped using AES-KW or AES-GCM with a key derived from WebAuthn PRF extension bytes / PBKDF2 (100,000+ iterations).

### 2.2 Key Lifecycle & Zeroization
- **In-Memory Retention**: The unlocked `CryptoKey` reference exists exclusively in JS heap memory during the unlocked session.
- **Auto-Lock Trigger**: Inactivity timer triggers explicit key reference purge (`sessionKey = null`) and resets React state tree.

---

## 3. Storage Layer Specification (IndexedDB)

### Database: `SovereignVaultDB` (Schema v2)

#### Object Store 1: `vaultItems`
- `id` (string, Primary Key - UUID v4)
- `category` (string, Indexed: `note` | `document` | `password` | `card`)
- `encryptedPayload` (Uint8Array, Encrypted JSON string of item content)
- `iv` (Uint8Array, 12-byte initialization vector)
- `createdAt` (number, Timestamp)
- `updatedAt` (number, Timestamp - Indexed)

#### Object Store 2: `vaultSecrets`
- `id` (string, Primary Key: `primary`)
- `credentialId` (Uint8Array)
- `wrapSalt` (Uint8Array)
- `wrappedVaultKey` (Uint8Array)
- `wrappedVaultKeyIv` (Uint8Array)
- `keyVersion` (number)
- `createdAt` (number)
- `updatedAt` (number)

#### Object Store 3: `vaultEmbeddings`
- `noteId` (string, Primary Key)
- `vector` (number[], 512-dimension Float32 array)
- `model` (string, Model identifier e.g. `Xenova/all-MiniLM-L6-v2`)
- `updatedAt` (number)

#### Object Store 4: `backupSnapshots`
- `id` (string, Primary Key)
- `payload` (Uint8Array, Encrypted `.vlt` binary payload)
- `source` (string, `auto` | `manual`)
- `itemCount` (number)
- `createdAt` (number, Indexed)

---

## 4. Input & File Upload Safety Architecture

1. **Backup File Import Validation**:
   - Max file size cap: `50 MB`.
   - Magic Header Check: Enforces format matching `sovereign-vault-backup`.
   - Schema Type Verification: Rejects missing or malformed JSON keys before attempting decryption.
2. **String & Tag Input Sanitization**:
   - Category validation against strict enum `['note', 'document', 'password', 'card']`.
   - Tag sanitization: Trimmed, lowercased, stripped of HTML control characters.
