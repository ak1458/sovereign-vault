# Product Requirements Document (PRD)

## Project: SovereignVault
**Classification:** Enterprise Zero-Knowledge Personal Vault System  
**Version:** 1.0.0-Production  
**Architecture:** Local-First, Device-Bound Zero-Trust Security Model  

---

## 1. Product Vision & Scope

SovereignVault is a **sovereign personal memory and security data engine**. Unlike traditional cloud-synced notes applications or online password managers, SovereignVault enforces a **Zero-Knowledge, Zero-Telemetry, Device-Bound Architecture**.

### Core Product Directives
- **Zero-Knowledge Storage**: Plaintext user data (notes, credentials, cards, documents) never touches disk or external network endpoints unencrypted.
- **Hardware-Backed Cryptographic Identity**: Authentication is tied to WebAuthn / FIDO2 platform authenticators (TouchID, FaceID, Windows Hello) via PRF key wrapping.
- **Zero External Server Dependency**: Execution is 100% client-side (IndexedDB + Web Crypto API + ONNX local embeddings).
- **Hardened Input & File Safety**: Strict validation on all user input, file imports, and state transitions to prevent XSS, prototype pollution, and DoS.

---

## 2. Core Functional Requirements

### 2.1 Cryptographic Vault Engine
| Feature ID | Feature Name | Specification | Security Boundary |
|------------|--------------|---------------|-------------------|
| `REQ-SEC-01` | Key Derivation & Wrapping | 256-bit AES-GCM vault key wrapped with WebAuthn PRF / Argon2id fallback. | Memory-only during active session. |
| `REQ-SEC-02` | End-to-End Payload Encryption | All vault items encrypted with individual 96-bit IVs before IndexedDB write. | Zero plaintext on disk. |
| `REQ-SEC-03` | Session Auto-Lock | Configurable inactivity timer (1–30 min) that purges in-memory keys and wipes active state. | Forced memory release. |
| `REQ-SEC-04` | Encrypted Backup Export/Import | Versioned `.vlt` backup blob containing AES-GCM wrapped vault snapshot with HMAC checksum. | Tamper-proof offline backup. |

### 2.2 Vault Item Classification
The vault supports 4 primary structured categories:
1. **Secure Notes**: Unstructured markdown thoughts, ideas, and cognitive entries.
2. **Documents**: Formatted specs, transcripts, and code snippets.
3. **Passwords**: Secret key-value pairs, usernames, and secret credentials.
4. **Cards**: Payment / identity information metadata.

### 2.3 Local Semantic Search & AI Intelligence
- **Local Embedding Vector Engine**: On-device vector calculation using Web Workers.
- **Cosine Similarity Ranking**: Semantic vector match calculated locally without transmitting content to external AI APIs.
- **Privacy Gateway Model**: Third-party AI requests (if explicitly enabled) pass strictly through encrypted user-triggered client actions.

---

## 3. Non-Functional Requirements & Security Metrics

### 3.1 Security & Threat Model Coverage
- **Rate Limiting**: PIN & Auth retry counter with exponential backoff lockout (max 5 retries -> 5s to 60s cooldown).
- **Input Sanitization**: All HTML/Markdown rendered via sanitized parsers preventing DOM XSS.
- **File Import Safety**: Strict magic-header and structure validation before backup parsing.
- **Information Leakage Prevention**: Errors sanitized to non-verbose UI messages; raw stack traces logged only to browser dev console.

### 3.2 Performance SLA
- **Vault Unlock Latency**: `< 150ms` on mobile and desktop.
- **Local Search Latency**: `< 50ms` for text query match across 1,000 items.
- **Vector Search Latency**: `< 200ms` for 512-dimension cosine similarity scan across 1,000 items.
- **Bundle Footprint**: `< 150 KB` gzipped core bundle.
