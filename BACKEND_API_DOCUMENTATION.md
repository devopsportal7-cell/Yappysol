# Yappysol Backend API Documentation

## Overview
Yappysol is a Solana AI copilot backend that provides authentication, chat functionality, token operations, portfolio management, and transaction tracking. This document outlines all available endpoints, request/response formats, and integration requirements for frontend development.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 🔐 Authentication Endpoints (`/api/auth`)

### 1. User Registration
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

**Validation:**
- Email and password required
- Password minimum 8 characters

---

### 2. User Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

---

### 3. Privy Authentication
**POST** `/api/auth/privy`

**Request Body:**
```json
{
  "privyToken": "privy_access_token",
  "privyUser": {
    "id": "privy_user_id",
    "email": "user@example.com"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Privy authentication successful",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

---

### 4. Import Wallet
**POST** `/api/auth/import-wallet` 🔒

**Request Body:**
```json
{
  "privateKey": "wallet_private_key"
}
```

**Response (200):**
```json
{
  "message": "Wallet imported successfully",
  "wallet": {
    "id": "wallet-uuid",
    "publicKey": "wallet_public_key",
    "isImported": true
  }
}
```

---

### 5. Get User Wallets
**GET** `/api/auth/wallets` 🔒

**Response (200):**
```json
{
  "wallets": [
    {
      "id": "wallet-uuid",
      "publicKey": "wallet_public_key",
      "isImported": true,
      "balance": "1.5"
    }
  ]
}
```

---

### 6. Get User API Keys
**GET** `/api/auth/api-keys` 🔒

**Response (200):**
```json
{
  "apiKeys": [
    {
      "id": "api-key-uuid",
      "service": "moralis",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 7. Verify Token
**GET** `/api/auth/verify` 🔒

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

---

### 8. Logout
**POST** `/api/auth/logout` 🔒

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 9. Logout All Sessions
**POST** `/api/auth/logout-all` 🔒

**Response (200):**
```json
{
  "message": "All sessions logged out successfully"
}
```

---

## 💬 Chat Endpoints (`/api/chat`)

### 1. Send Chat Message (Main AI Endpoint)
**POST** `/api/chat/message` 🔒

**Request Body:**
```json
{
  "message": "Swap 1 SOL for USDC",
  "context": {
    "walletAddress": "wallet_address",
    "previousMessages": []
  },
  "sessionId": "session-uuid"
}
```

**Response (200):**
```json
{
  "response": "I'll help you swap 1 SOL for USDC...",
  "intent": "swap",
  "action": "transaction_preview",
  "data": {
    "fromToken": "SOL",
    "toToken": "USDC",
    "amount": "1",
    "estimatedOutput": "150.50"
  },
  "sessionId": "session-uuid"
}
```

**Features:**
- Intent recognition (swap, portfolio, create_token, etc.)
- Context-aware responses
- Transaction previews
- Session persistence

---

### 2. Get Chat Sessions
**GET** `/api/chat/sessions` 🔒

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "title": "Trading Discussion",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "message_count": 5
    }
  ]
}
```

---

### 3. Create Chat Session
**POST** `/api/chat/sessions` 🔒

**Request Body:**
```json
{
  "title": "New Trading Session"
}
```

**Response (200):**
```json
{
  "session": {
    "id": "session-uuid",
    "title": "New Trading Session",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Get Specific Chat Session
**GET** `/api/chat/sessions/:id` 🔒

**Response (200):**
```json
{
  "session": {
    "id": "session-uuid",
    "title": "Trading Discussion",
    "messages": [
      {
        "id": "msg-uuid",
        "content": "Swap 1 SOL for USDC",
        "role": "user",
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "content": "I'll help you with that swap...",
        "role": "assistant",
        "action": "transaction_preview",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 5. Update Chat Session
**PUT** `/api/chat/sessions/:id` 🔒

**Request Body:**
```json
{
  "messages": [...],
  "customTitle": "Updated Title"
}
```

---

### 6. Add Message to Session
**POST** `/api/chat/sessions/:id/messages` 🔒

**Request Body:**
```json
{
  "content": "Message content",
  "role": "user",
  "attachments": [],
  "action": "optional_action"
}
```

---

### 7. Delete Chat Session
**DELETE** `/api/chat/sessions/:id` 🔒

**Response (200):**
```json
{
  "message": "Session deleted successfully"
}
```

---

## 🪙 Token Endpoints (`/api/token`)

### 1. Get Token Price
**POST** `/api/token/price`

**Request Body:**
```json
{
  "tokenAddress": "token_mint_address"
}
```

**Response (200):**
```json
{
  "price": "0.001234",
  "symbol": "BONK",
  "name": "Bonk",
  "logoURI": "https://...",
  "priceChange24h": "+5.67%",
  "marketCap": "123456789",
  "volume24h": "9876543"
}
```

---

### 2. Get Portfolio Data
**POST** `/api/token/portfolio`

**Request Body:**
```json
{
  "walletAddress": "wallet_public_key"
}
```

**Response (200):**
```json
{
  "message": "Portfolio formatted for chat display"
}
```

---

### 3. Get Trending Tokens
**POST** `/api/token/trending`

**Response (200):**
```json
{
  "tokens": [
    {
      "address": "token_mint",
      "symbol": "BONK",
      "name": "Bonk",
      "price": "0.001234",
      "change24h": "+15.67%",
      "volume24h": "1234567"
    }
  ]
}
```

---

### 4. Execute Token Swap
**POST** `/api/token/swap`

**Request Body:**
```json
{
  "fromToken": "SOL",
  "toToken": "USDC",
  "amount": "1.0",
  "slippage": "0.5",
  "walletAddress": "wallet_public_key"
}
```

**Response (200):**
```json
{
  "transaction": "unsigned_transaction_base64",
  "estimatedOutput": "150.50",
  "fees": "0.005",
  "route": "Jupiter"
}
```

---

### 5. Create New Token
**POST** `/api/token/create`

**Request Body:**
```json
{
  "name": "My Token",
  "symbol": "MTK",
  "description": "My custom token",
  "image": "base64_image_data",
  "decimals": 9,
  "supply": "1000000",
  "walletAddress": "creator_wallet"
}
```

**Response (200):**
```json
{
  "transaction": "unsigned_transaction_base64",
  "mintAddress": "new_token_mint",
  "message": "Token creation transaction ready"
}
```

---

## 📊 Portfolio Endpoints (`/api/portfolio`)

### 1. Get Portfolio for Wallet
**GET** `/api/portfolio/:walletAddress`

**Response (200):**
```json
[
  {
    "mint": "token_mint_address",
    "symbol": "SOL",
    "name": "Solana",
    "amount": "1000000000",
    "decimals": 9,
    "uiAmount": "1.0",
    "usdValue": "150.50",
    "price": "150.50",
    "image": "https://...",
    "solscan": "https://solscan.io/token/..."
  }
]
```

---

## 📈 Trending Tokens (`/api/trending-tokens`)

### 1. Get All Trending Tokens
**GET** `/api/trending-tokens/`

**Response (200):**
```json
{
  "prompt": "Array of trending tokens with details"
}
```

### 2. Update Trending Tokens
**POST** `/api/trending-tokens/update`

**Request Body:**
```json
{
  "tokens": [
    {
      "address": "token_mint",
      "symbol": "BONK",
      "name": "Bonk"
    }
  ]
}
```

---

## 💸 Transactions (`/api/transactions`)

### 1. Get Transaction History
**GET** `/api/transactions/:walletAddress`

**Response (200):**
```json
[
  {
    "signature": "transaction_signature",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "type": "swap",
    "fromToken": "SOL",
    "toToken": "USDC",
    "amount": "1.0",
    "value": "150.50",
    "status": "success"
  }
]
```

---

## 🔧 Testing/Utilities (`/api/helius-test`)

### 1. Test Helius API
**POST** `/api/helius-test`

**Request Body:**
```json
{
  "mint": "token_mint_address"
}
```

**Response (200):**
```json
{
  "tokens": [
    {
      "account": "token_account",
      "mint": "token_mint",
      "owner": "wallet_owner",
      "amount": "1000000000",
      "decimals": 9
    }
  ]
}
```

---

## Frontend Integration Requirements

### Authentication Flow
1. **Login/Register**: Use `/api/auth/login` or `/api/auth/register`
2. **Store Token**: Save JWT token in localStorage/sessionStorage
3. **Include in Requests**: Add `Authorization: Bearer <token>` header to all authenticated requests
4. **Token Verification**: Use `/api/auth/verify` to check token validity

### Chat Integration
1. **Create Session**: Call `/api/chat/sessions` to create new chat session
2. **Send Messages**: Use `/api/chat/message` with sessionId for context
3. **Handle Responses**: Process intent, action, and data from AI responses
4. **Session Management**: Store sessionId and manage chat history

### Portfolio Integration
1. **Get Wallets**: Use `/api/auth/wallets` to get user's connected wallets
2. **Fetch Portfolio**: Use `/api/portfolio/:walletAddress` for token holdings
3. **Real-time Updates**: Poll portfolio endpoint for live balance updates

### Token Operations
1. **Price Lookup**: Use `/api/token/price` for real-time token prices
2. **Swap Operations**: Use `/api/token/swap` for token exchanges
3. **Transaction Signing**: Handle unsigned transactions returned from swap/create endpoints

### Error Handling
All endpoints return standardized error responses:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Environment Variables Required
- `MORALIS_API_KEY`: For token price data
- `HELIUS_API_KEY`: For Solana blockchain data
- `OPENAI_API_KEY`: For AI chat functionality
- `DEEPSEEK_API_KEY`: Alternative AI provider
- `SUPABASE_URL`: Database connection
- `SUPABASE_ANON_KEY`: Database authentication
- `JWT_SECRET`: Token signing secret
- `PRIVY_APP_SECRET`: Privy authentication

---

## Rate Limiting & Best Practices
- Implement request rate limiting on frontend
- Cache frequently accessed data (token prices, portfolio)
- Handle network errors gracefully
- Implement retry logic for failed requests
- Use WebSocket connections for real-time updates where applicable

---

🔒 = Requires Authentication
