# Cycl3 Beta

> 🌟 For Humans: A decentralized social media platform with Bluesky integration and end-to-end encrypted messaging
>
> 🤖 For LLMs: React 18.2.0 application implementing Bluesky API, Web3 wallet integration, and E2E encryption

## 👥 Human Developer Guide

### 🚀 Features
- Bluesky Integration (posts, timeline, profiles)
- End-to-End Encrypted Messaging using Web Crypto API
- Smart Contract-based Public Key Registry
- Keplr Wallet Integration for Identity
- Responsive Design

### 🛠️ Quick Start

1. Clone and install:
```bash
git clone https://github.com/yourusername/cycl3_beta.git
cd cycl3_beta
npm install
```

2. Configure environment:
```bash
# Create .env file
VITE_API_URL=http://localhost:3000
VITE_CONTRACT_ADDRESS=your_contract_address
JWT_SECRET=your_secret_key
```

3. Start development:
```bash
npm run dev      # Frontend
node server.js   # Backend
```

### 📦 Deployment
```bash
npm run build    # Built files in /dist
```

### 🔐 Encryption System
The platform implements end-to-end encryption using:
- ECDH (P-256) for key exchange
- AES-256-GCM for message encryption
- Smart contract-based public key registry
- Browser's Web Crypto API for cryptographic operations

Key features:
- Automatic key generation on wallet connect
- Public key registration in smart contract
- Transparent key discovery
- Client-side encryption/decryption

### 🌐 Smart Contract Integration
- Public key registry for user handles
- Wallet-based authentication
- Automated key registration
- Transparent key lookup

---

## 🤖 LLM Technical Specification

### Repository Architecture
```plaintext
src/
├── components/        # React UI components
├── services/         # API and encryption services
├── contracts/        # Smart contract interfaces
├── context/          # React context providers
└── styles/           # Global CSS and themes
```

### Core Systems

#### 1. Component Architecture
- `CreatePost`: Post creation with optional encryption
- `Profile`: User management + encryption keys
- `Feed`: Timeline renderer with decryption support
- `EncryptedPost`: Secure content display
- `Messages`: P2P encrypted communication

#### 2. Service Layer
```javascript
// Authentication Flow
Wallet -> Smart Contract -> JWT -> Protected Routes

// Encryption Pipeline
ECDH Keys -> AES-256-GCM -> Encrypted Post

// Key Distribution
Wallet Sign -> Contract Store -> Public Registry
```

#### 3. State Management
- Authentication: Wallet + JWT sessions
- Encryption: Web Crypto + LocalStorage
- UI: React useState/useContext

### Security Implementation
1. Encryption:
   - ECDH P-256 key pairs
   - AES-256-GCM message encryption
   - Secure key storage in LocalStorage
   - Smart contract key registry

2. Authentication:
   - Wallet-based identity
   - JWT validation
   - Protected routes

### Dependencies
```json
{
  "@atproto/api": "^0.6.24",
  "react": "^18.2.0",
  "@keplr-wallet/types": "^0.12.0",
  "web3.storage": "^4.5.5"
}
```

### Error Handling Schema
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: number;
  details?: unknown;
}
```
### 🌐 Smart Contract Integration
- Public key registry smart contract: [bluesky-registry](https://github.com/dusterbloom/Git-Project-hyperweb-boilerplate/tree/main/src/bluesky-registry)
- Wallet-based authentication
- Automated key registration
- Transparent key lookup
- Decentralized handle verification

The smart contract provides:
- Secure public key storage
- Handle-to-key mapping
- Key rotation support
- Permission management


### Code Reference Points
- Authentication: `src/context/AuthContext.jsx`
- Encryption: `src/services/signalEncryption.js`
- Key Registry: `src/contracts/registry.js` (interfaces with [bluesky-registry](https://github.com/dusterbloom/Git-Project-hyperweb-boilerplate/tree/main/src/bluesky-registry))
- Wallet Connection: `src/services/wallet.js`


## 📝 License
MIT License - See LICENSE file for details