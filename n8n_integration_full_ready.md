
# 🧠 Tikka n8n Integration & Backend Sync (Full Specification)

This document describes how to wire your **n8n** workflow, **backend endpoints**, and **Lovable frontend** for the complete YappySol/Tikka chat orchestration.

---

## 🌐 Webhook URL
**n8n Chat Webhook:**  
`https://n8n.srv1077811.hstgr.cloud/webhook/yappysol`

All frontend chat requests will be sent here.

---

## 🎯 Objective
Integrate **n8n orchestration** for all core Tikka chatbot intents — Launch Token, Buy Token (Swap), Portfolio, Price, Trending, and QA.

- Frontend ↔️ n8n ↔️ Backend integration
- Unified request/response contract
- Consistent JSON schema for Lovable frontend
- Secure backend invocation from n8n

---

## ⚙️ n8n Workflow Overview

### Entry Flow
| Node | Description |
|------|--------------|
| **Webhook In** | Receives chat messages from Lovable frontend |
| **Init Session** | Adds session metadata |
| **Router (OpenAI Chat)** | Detects user intent and entities |
| **Switch Intent** | Routes to QA / Launch / Buy / Portfolio / etc |
| **Hybrid Merge** | Combines Vector + Keyword KB results |
| **IF HaveKB** | Decides whether to use KB answer or fallback |
| **Action Flows** | Launch, Buy, Portfolio, etc. call backend |
| **Respond to Webhook** | Returns unified response to frontend |

---

## 💬 Intent Flows & Backend Endpoints

### 1. Launch Token Flow
| Purpose | Launch token on-chain |
|----------|----------------------|
| **n8n Node** | Launch: Seed (backend) |
| **Backend Endpoint** | `POST /api/chain/launch/seed` |
| **Confirm Endpoint** | `POST /api/chain/launch` |

### 2. Buy Token (Swap)
| Purpose | Execute token swap |
|----------|-------------------|
| **n8n Node** | Buy: Seed (backend) |
| **Backend Endpoint** | `POST /api/chain/buy/seed` |
| **Confirm Endpoint** | `POST /api/chain/buy` |

### 3. Portfolio
| Purpose | Fetch user’s portfolio |
|----------|------------------------|
| **n8n Node** | Portfolio: Call Backend |
| **Backend Endpoint** | `POST /api/token/portfolio` |

### 4. Token Price
| Purpose | Fetch token price |
|----------|------------------|
| **n8n Node** | Price: Call Backend |
| **Backend Endpoint** | `POST /api/token/price` |

### 5. Trending Tokens
| Purpose | Fetch trending tokens |
|----------|-----------------------|
| **n8n Node** | Trending: Call Backend |
| **Backend Endpoint** | `GET /api/trendingTokens` |

---

## 🔄 Request / Response Contracts

### Webhook (Frontend → n8n)
**POST** `https://n8n.srv1077811.hstgr.cloud/webhook/yappysol`
```json
{
  "session_id": "sess-01",
  "user_id": "bukola",
  "text": "launch a token",
  "walletRef": "default-wallet"
}
```
**Response**
```json
{
  "route": "chat | confirm",
  "message": "Seed data prepared. Proceed to confirmation.",
  "meta": { "intent": "LAUNCH_TOKEN", "confidence": 0.91 },
  "session_id": "sess-01"
}
```

### Backend Response (n8n → Frontend via Webhook)
```json
{
  "intent": "BUY_TOKEN",
  "status": "swap_initialized",
  "pair": "SOL/USDT",
  "amount": 1,
  "message": "Swap initiated successfully."
}
```

---

## ⚡ Backend Contracts (n8n → Backend)

### Example: Launch Token
```json
{
  "session_id": "sess-01",
  "user_id": "bukola",
  "wallet": "walletPubKey",
  "chain": "solana",
  "token": {
    "symbol": "TIKKA",
    "name": "Tikka Token",
    "supply": "1000000",
    "decimals": 6,
    "image_url": "https://example.com/logo.png"
  }
}
```
Response
```json
{
  "pending_id": "uuid",
  "preview": {
    "human_text": "You are about to launch TIKKA...",
    "fields": { "symbol": "TIKKA", "supply": "1000000" }
  }
}
```

---

## 🧩 n8n Nodes to Wire

### Merge Node (Before Hybrid Merge)
- **Mode:** Wait for All
- Ensures both Keyword & Vector retrieval complete.

### Hybrid Merge Node (Code)
```js
const vecItems = $items('QA: Supabase Vector (RPC)');
const kwItems = $items('QA: Keyword Search');

const vec = vecItems.map(i => ({ ...i.json, _src: 'vector' }));
const kw  = kwItems.map(i => ({ ...i.json, _src: 'keyword' }));

const all = [...kw, ...vec];
const haveKW = kw.length > 0;
const haveVec = vec.length > 0;

return [{ json: { haveKW, haveVec, chunks: all.slice(0,8) } }];
```

### IF Node (After Hybrid Merge)
Condition: `{{ $json.haveKW || $json.haveVec }}`  
True → Continue to QA Decide  
False → Route to Fallback

---

## 🔁 Data Flow Logic

1. **Frontend → n8n** — sends chat via Webhook.  
2. **n8n Router** detects intent.  
3. **If QA** → retrieves data from Vector + Keyword KB.  
4. **If actionable (Launch/Buy/Portfolio)** → calls backend endpoint.  
5. **Backend → n8n** returns status or data.  
6. **n8n → Frontend** replies via Webhook with user-facing message.

---

## 🪄 Frontend Integration Guide (Lovable)

- Always call: `POST /api/chat` → internally proxies to n8n webhook.
- Display `message` as user text.
- Follow `route` (“chat” = normal, “confirm” = awaiting user input).
- Maintain `session_id` and pass it back on each request.

Example React handler:
```js
const handleChat = async (input) => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, user_id, text: input })
  }).then(r => r.json());

  showMessage(res.message);
  if (res.route === 'confirm') showConfirmOptions();
};
```

---

## 🔐 Security

- **n8n → Backend:** `Authorization: Bearer <SERVER_KEY>`  
- **Frontend → n8n:** Use unguessable webhook path (already satisfied)  
- **Optional:** Add HMAC signature via `BACKEND_WEBHOOK_SECRET`  
- **CORS:** Restrict origins to frontend domain only.

---

## 🧠 State Tables (Supabase)

| Table | Purpose |
|--------|----------|
| `user_sessions` | Manage chat sessions |
| `pending_actions` | Store incomplete launch/swap steps |
| `kb_chunks` | Knowledge base vector store |

---

## 🚀 Testing Endpoints

```bash
curl -X POST https://n8n.srv1077811.hstgr.cloud/webhook/yappysol  -H 'Content-Type: application/json'  -d '{"session_id":"sess-01","user_id":"bukola","text":"what is SOL"}'
```

**Expected Output**
```json
{
  "route": "chat",
  "message": "SOL is the native token of Solana...",
  "meta": { "intent": "QA", "confidence": 0.96 }
}
```

---

## ✅ Summary
- All flows unified via `https://n8n.srv1077811.hstgr.cloud/webhook/yappysol`  
- n8n handles routing, retrieval, and backend sync.  
- Backend endpoints provide confirmed data/actions.  
- Lovable frontend only interacts with n8n webhooks.  
- Structured contracts ensure stability across updates.
