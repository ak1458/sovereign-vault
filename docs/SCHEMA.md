# Data Schema & Encrypted Envelope Specifications (SCHEMA.md)

## Project: SovereignVault
**Database Engine:** IndexedDB (via Dexie.js v4)  
**Encryption Cipher:** AES-256-GCM (Web Crypto API)  

---

## 1. IndexedDB Table Schemas

### Table 1: `vaultItems`
Stores encrypted note/item records.

```typescript
interface VaultItemRecord {
  id: string;              // Primary Key (UUID v4)
  category: string;        // 'note' | 'document' | 'password' | 'card'
  encryptedPayload: Uint8Array; // AES-256-GCM cipher bytes of serialized JSON payload
  iv: Uint8Array;          // 12-byte (96-bit) random IV
  createdAt: number;       // Unix epoch timestamp (ms)
  updatedAt: number;       // Unix epoch timestamp (ms) - Indexed
}
```

### Decrypted Payload Interface (In-Memory Only)
```typescript
interface VaultItemPayload {
  title: string;
  content: string;
  category: 'note' | 'document' | 'password' | 'card';
  tags: string[];
  metadata?: Record<string, unknown>;
}
```

---

### Table 2: `vaultSecrets`
Stores the wrapped primary vault encryption key.

```typescript
interface VaultSecretRecord {
  id: string;              // Primary Key ('primary')
  credentialId: Uint8Array;// WebAuthn credential ID bytes
  wrapSalt: Uint8Array;    // Salt for PRF key derivation (32 bytes)
  wrappedVaultKey: Uint8Array; // AES-KW / AES-GCM wrapped VEK bytes
  wrappedVaultKeyIv: Uint8Array; // 12-byte IV for key wrapping
  keyVersion: number;      // Schema version (current: 1)
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
}
```

---

### Table 3: `vaultEmbeddings`
Stores vector embeddings for local semantic search.

```typescript
interface VaultEmbeddingRecord {
  noteId: string;          // Primary Key (foreign key to vaultItems.id)
  vector: number[];        // 512-dimension Float32 vector array
  model: string;           // Model ID ('Xenova/all-MiniLM-L6-v2')
  updatedAt: number;       // Timestamp
}
```

---

### Table 4: `backupSnapshots`
Stores auto and manual encrypted vault snapshots.

```typescript
interface VaultBackupSnapshotRecord {
  id: string;              // Primary Key (UUID v4)
  payload: Uint8Array;     // Encrypted .vlt envelope bytes
  source: 'auto' | 'manual';
  itemCount: number;
  createdAt: number;       // Timestamp - Indexed
}
```

---

## 2. Encrypted Backup File Envelope (`.vlt`)

```json
{
  "format": "sovereign-vault-backup",
  "version": 2,
  "exportedAt": 1771800000000,
  "checksum": "sha256-hash-of-vault-bytes",
  "vault": {
    "items": [
      {
        "id": "uuid-v4-string",
        "category": "note",
        "encryptedPayload": "base64-encoded-string",
        "iv": "base64-encoded-iv-string",
        "createdAt": 1771800000000,
        "updatedAt": 1771800000000
      }
    ],
    "secret": {
      "id": "primary",
      "credentialId": "base64-string",
      "wrapSalt": "base64-string",
      "wrappedVaultKey": "base64-string",
      "wrappedVaultKeyIv": "base64-string",
      "keyVersion": 1,
      "createdAt": 1771800000000,
      "updatedAt": 1771800000000
    },
    "embeddings": [
      {
        "noteId": "uuid-v4-string",
        "vector": [0.012, -0.045, 0.128],
        "model": "Xenova/all-MiniLM-L6-v2",
        "updatedAt": 1771800000000
      }
    ]
  }
}
```
