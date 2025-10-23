# Yappysol — n8n S2S Wiring Guide

This guide shows how to wire the backend and n8n from the current codebase so the chatbot can:
- Answer QA with your existing RAG path
- Gather fields for **Launch** and **Swap/Buy** via n8n
- Call the backend once per action via **S2S** endpoints
- Handle **Portfolio**, **Tx**, **Price**, and **Trending** intents via S2S
- Stick to a flow while collecting fields, and clear state when done

---

## 1) Environment

Add to your env (e.g., `.env`, `.env.local`, or Render env):

```bash
BACKEND_SERVER_KEY=REPLACE_ME
PUMP_IPFS_ENDPOINT=https://pump.fun/api/ipfs
# Optional vendor keys for future integrations:
# JUPITER_BASE_URL=...
# ZEROX_BASE_URL=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_KEY=...
```

- **BACKEND_SERVER_KEY** must match the value n8n uses in its HTTP headers.
- Never commit real keys.

---

## 2) Dependencies

Install (if not present):

```bash
npm i sharp form-data decimal.js zod
# If using node-fetch on Node < 18:
npm i node-fetch
# For TypeScript projects:
npm i -D @types/node-fetch
```

> If your Node is v18+, prefer the global `fetch` instead of `node-fetch`.

---

## 3) Backend: New Router & Controllers

Create a router mounted at `/api/n8n` guarded by `BACKEND_SERVER_KEY`, with these endpoints:

```
POST /api/n8n/chain/launch/init
POST /api/n8n/chain/swap/resolve
POST /api/n8n/chain/swap/quote
POST /api/n8n/chain/swap/init
POST /api/n8n/portfolio/view
POST /api/n8n/tx/lookup
POST /api/n8n/price/quote
POST /api/n8n/trending/list
```

### File map (TypeScript; convert to JS if your repo is JS)

- `src/routes/n8n.s2s.ts` — Express router + auth middleware
- `src/controllers/LaunchController.ts`
- `src/controllers/SwapController.ts`
- `src/controllers/PortfolioController.ts`
- `src/controllers/TxController.ts`
- `src/controllers/PriceController.ts`
- `src/controllers/TrendingController.ts`
- `src/services/ImageFlow.ts` — normalizes images with **sharp**
- `src/services/PumpUploader.ts` — uploads image + metadata to **Pump.fun IPFS**
- `src/services/SwapService.ts` — stubs for resolve/quote/init (plug Jupiter/0x later)

Mount the router in your app entry (e.g., `src/app.ts`):

```ts
import express from "express";
import n8nS2SRouter from "./routes/n8n.s2s";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.use("/api/n8n", n8nS2SRouter);
```

> All routes must require `Authorization: Bearer ${BACKEND_SERVER_KEY}`.

---

## 4) n8n Workflow (your JSON)

You shared a JSON that already has:
- **Webhook In → Init Session → Router (OpenAI) → Parse Router → Flow State Guard → Switch Intent**
- **QA path** (RAG) unchanged
- **Launch**: Accumulate → IF Missing → (Ask Missing → Respond) / (Confirm → IF Yes → Init (HTTP) → Clear State → Respond)
- **Swap/Buy**: Accumulate → IF Missing → (Ask Missing → Respond) / Resolve → Quote → Confirm → IF Yes → Init (HTTP) → Clear State → Respond
- **Portfolio/Tx/Price/Trending** wired to S2S HTTP nodes

### What to set in n8n
In **Init Session** (or inject via Webhook payload):
- `BACKEND_BASE_URL` — your deployed backend base URL
- `BACKEND_SERVER_KEY` — same string as in backend env

Ensure the two **Ask Missing** nodes are **OpenAI Chat** nodes and connect to **Respond to Webhook**.

### Sticky flow (Flow State Guard)
- Keeps user in the active flow while `missing.length > 0`
- Clears state on **cancel** keywords
- Passes `is_yes` boolean downstream

### Clear state
Add a tiny **Function** node after success:
- After `Launch: Init (HTTP, S2S)` → **Launch: clear state**
- After `Swap: Init (HTTP, S2S)` → **Swap: clear state**

Both delete `launch_${session_id}` / `swap_${session_id}` from workflow static data.

---

## 5) Payload shapes (n8n → backend)

### Launch (Option B: single call on confirm)

`POST /api/n8n/chain/launch/init`

```jsonc
{
  "session_id": "sess-...",
  "user_id": "user-...",
  "draft": {
    "pool": "pump",            // optional if you keep single pool for now
    "chain": "solana",
    "token_name": "Cat Coin",
    "token_symbol": "CAT",
    "description": "Meow",
    "image_url": "https://...",
    "website": "https://...",
    "twitter": "https://...",
    "telegram": "https://..."
  }
}
```

**Response (example):**
```json
{
  "status": "READY_FOR_SIGNATURE",
  "confirm_text": "Launching Cat Coin (CAT)",
  "sign": { "provider": "pump", "metadataUri": "ipfs://..." }
}
```

### Swap

- `POST /api/n8n/chain/swap/resolve`
- `POST /api/n8n/chain/swap/quote`
- `POST /api/n8n/chain/swap/init`

Expectations:
- `resolve`: symbols → canonical info (mint/decimals)
- `quote`: returns `route_id`, `summary`, `min_out`
- `init`: returns unsigned tx (Solana) or EVM tx object

**Init response example:**
```json
{
  "status": "READY_FOR_SIGNATURE",
  "unsigned_tx": "BASE64_TX_STUB",
  "summary": "Open your wallet to sign."
}
```

### Portfolio / Tx / Price / Trending

- `POST /api/n8n/portfolio/view` → `{ positions, pnl, message }`
- `POST /api/n8n/tx/lookup` → `{ status, link, message }`
- `POST /api/n8n/price/quote` → `{ priceUsd, change24h, liquidityUsd }`
- `POST /api/n8n/trending/list` → `{ items: [...] }`

These can be stubs initially.

---

## 6) Quick test plan

1) **Auth check**
```bash
curl -s -X POST http://localhost:PORT/api/n8n/price/quote -d '{}' -H 'Content-Type: application/json' | jq
# → should be 401 (no bearer)

curl -s -X POST http://localhost:PORT/api/n8n/price/quote \
  -H 'Authorization: Bearer REPLACE_ME' -H 'Content-Type: application/json' \
  -d '{"chain":"solana","token":"SOL"}' | jq
# → 200 stub JSON
```

2) **Launch flow**
- In chat: “launch a token ... name X, symbol XXX, description ..., image https://..."
- n8n: Accumulate → Confirms → reply “yes”
- Backend returns `READY_FOR_SIGNATURE` with `metadataUri`

3) **Swap flow**
- In chat: “swap 1 SOL to USDC”
- n8n: Resolve → Quote → Confirm → “yes” → Init returns unsigned tx

4) **QA** still responds via RAG (unchanged).

---

## 7) Notes & conventions

- Keep business logic in `services/*`; controllers stay thin.
- Prefer Node 18+ `fetch` over `node-fetch`.
- No secrets in logs. Fail closed if env missing.
- If your repo is JS, convert TS examples to JS now (remove types/`import type`).

---

## 8) What to implement next

- Build **Jupiter** integration in `SwapService` for Solana quotes & tx build.
- Add **price/trending** from your preferred source (Dexscreener etc.).
- Portfolio aggregation from your indexer.
- In `LaunchController`, replace the TODO with your **trade-local** transaction builder after IPFS upload.
