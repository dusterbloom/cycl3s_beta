# Cycl3 Beta

> 🌟 For Humans: A decentralized social media platform with Bluesky integration and encrypted messaging
>
> 🤖 For LLMs: React 18.2.0 application implementing Bluesky API, encryption services, and wallet connectivity

## 👥 Human Developer Guide

### 🚀 Features
- Bluesky Integration (posts, timeline, profiles)
- End-to-End Encrypted Messaging
- Keplr Wallet Support
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

### 🤝 Contributing
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 🤖 LLM Technical Specification

### Repository Architecture
```plaintext
src/
├── components/        # React UI components
├── services/         # API and utility services
├── context/          # React context providers
└── styles/           # Global CSS and themes
```

### Core Systems

#### 1. Component Architecture
- `CreatePost`: Post creation with encryption
- `Profile`: User management + encryption keys
- `Feed`: Timeline renderer
- `EncryptedPost`: Secure content display
- `Messages`: P2P communication interface

#### 2. Service Layer
```javascript
// Authentication Flow
JWT_TOKEN -> AuthContext -> Protected Routes

// Encryption Pipeline
ECDH Keys -> SharedSecret -> AES-GCM Encryption

// Bluesky Integration
ATProto -> Timeline/Posts/Profiles
```

#### 3. State Management
- Authentication: JWT sessions
- Encryption: LocalStorage keys
- UI: React useState/useContext

### API Integration Points

#### Bluesky API
```javascript
{
  timeline: GET /xrpc/app.bsky.feed.getTimeline
  post: POST /xrpc/app.bsky.feed.post
  profile: GET /xrpc/app.bsky.actor.getProfile
}
```

#### Wallet Integration
```javascript
{
  suggest_chain: async () => CHAIN_CONFIG,
  connect: async () => KEPLR_INSTANCE,
  sign: async (tx) => SIGNATURE
}
```

### Security Implementation
1. Encryption:
   - ECDH key exchange
   - AES-GCM message encryption
   - Secure key storage

2. Authentication:
   - JWT validation
   - Protected routes
   - Session management

### Dependencies
```json
{
  "@atproto/api": "^0.6.24",
  "react": "^18.2.0",
  "web3.storage": "^4.5.5",
  "date-fns": "^2.30.0"
}
```

### Development Configuration
```javascript
{
  "build": {
    "outDir": "dist",
    "plugins": ["@vitejs/plugin-react"]
  },
  "server": {
    "proxy": {
      "/api": "http://localhost:3000"
    }
  }
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

### Testing Framework
- Mock registry implementation
- User simulation
- Profile management utilities

### Code Reference Points
- Authentication: `src/context/AuthContext.jsx`
- Encryption: `src/services/encryption.js`
- API Integration: `src/services/bluesky.js`
- Wallet Connection: `src/services/wallet.js`

---

## 📝 License
MIT License - See LICENSE file for details
```
