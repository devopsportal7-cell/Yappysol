# Lovable Frontend Update Instructions - REVERT TO ORIGINAL

## 🎯 Objective
**REVERT** the frontend back to using the original direct chat endpoint (n8n integration has been disabled due to bugs).

## 🔍 Current Issue
The frontend is sending requests to:
```
POST https://yappysol.onrender.com/api/n8n/n8n-webhook  ❌ WRONG (causing 500 errors)
```

But it should be sending to:
```
POST https://yappysol.onrender.com/api/chat/message  ✅ CORRECT (original working endpoint)
```

## 📋 Required Changes

### 1. Update API Endpoint

**Find and replace:**
- **Current endpoint:** `/api/n8n/n8n-webhook` ❌ WRONG
- **Correct endpoint:** `/api/chat/message` ✅ CORRECT

### 2. Update Request Payload Format

**Current format (WRONG):**
```json
{
  "session_id": "session-uuid",
  "user_id": "user-uuid", 
  "text": "user message",
  "walletRef": "wallet_address"
}
```

**Correct format (ORIGINAL):**
```json
{
  "message": "user message",
  "context": {
    "walletAddress": "wallet_address",
    "previousMessages": []
  },
  "sessionId": "session-uuid"
}
```

### 3. Update Response Handling

**Current format (WRONG):**
```json
{
  "message": "AI response text",
  "route": "chat",
  "meta": { ... },
  "session_id": "session-uuid"
}
```

**Correct format (ORIGINAL):**
```json
{
  "response": "AI response text",
  "intent": "swap",
  "action": "transaction_preview",
  "data": { ... },
  "sessionId": "session-uuid"
}
```

## 🔧 Implementation Steps

### Step 1: Update API Client

**Find the API client file** (likely in `src/services/api.ts` or similar) and update:

```typescript
// CURRENT CODE (WRONG)
const response = await fetch(`${API_BASE_URL}/api/n8n/n8n-webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    session_id: sessionId,
    user_id: userId,
    text: userMessage,
    walletRef: walletAddress
  })
});

// CORRECT CODE (ORIGINAL)
const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: userMessage,
    context: {
      walletAddress: walletAddress,
      previousMessages: messageHistory
    },
    sessionId: sessionId
  })
});
```

### Step 2: Update Response Processing

**Update the response handling:**

```typescript
// CURRENT CODE (WRONG)
const data = await response.json();
setMessages(prev => [...prev, {
  id: Date.now(),
  content: data.message,
  role: 'assistant',
  timestamp: new Date()
}]);

// CORRECT CODE (ORIGINAL)
const data = await response.json();
setMessages(prev => [...prev, {
  id: Date.now(),
  content: data.response,
  role: 'assistant',
  timestamp: new Date()
}]);
```

### Step 3: Update Error Handling

**Update error messages:**

```typescript
// OLD CODE
if (!response.ok) {
  throw new Error('Failed to send message');
}

// NEW CODE
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Failed to send message');
}
```

### Step 4: Ensure Wallet Information is Passed

**Make sure wallet address is automatically included:**

```typescript
// Ensure walletRef is always passed
const walletRef = context.walletAddress || context.wallet?.publicKey || 'default-wallet';

const requestBody = {
  session_id: sessionId,
  user_id: userId,
  text: userMessage,
  walletRef: walletRef
};
```

## 🧪 Testing Checklist

### Test Cases to Verify:

1. **Basic Chat Message**
   - Send: "Hello"
   - Expected: AI response without errors

2. **Price Query**
   - Send: "What is the price of SOL?"
   - Expected: Real-time SOL price from Moralis

3. **Portfolio Request**
   - Send: "Show my portfolio"
   - Expected: Real portfolio data from Helius/Moralis

4. **Token Creation**
   - Send: "Create a token called MyCoin"
   - Expected: Token creation flow initiation

5. **Swap Request**
   - Send: "Swap 1 SOL for USDC"
   - Expected: Swap flow initiation

## 🔍 Debugging Tips

### Check Network Tab
- Verify requests go to `/api/n8n/n8n-webhook`
- Check request payload format matches new structure
- Ensure `walletRef` is included in every request

### Common Issues:
1. **Missing walletRef**: Ensure wallet address is passed in every request
2. **Wrong payload format**: Double-check field names (`session_id`, `user_id`, `text`, `walletRef`)
3. **Response parsing**: Update to use `data.message` instead of `data.response`

## 📝 Environment Variables

**Ensure these are set in Lovable:**
```
VITE_API_BASE_URL=https://yappysol.onrender.com
VITE_BACKEND_SERVER_KEY=your_backend_server_key
```

## 🚀 Expected Behavior After Update

1. **Chat messages** flow through n8n workflow
2. **Real-time data** from blockchain APIs (Moralis, Helius, Jupiter)
3. **Consistent responses** with proper error handling
4. **Wallet integration** works seamlessly
5. **All features** (price, portfolio, swap, create) work through n8n

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify network requests in DevTools
3. Ensure all environment variables are set
4. Test with simple messages first

## ✅ Success Criteria

The update is successful when:
- ✅ No more 500 errors in network tab
- ✅ Chat messages get proper AI responses
- ✅ Price queries return real data
- ✅ Portfolio shows actual wallet data
- ✅ Token creation and swaps initiate properly
- ✅ All requests go to `/api/n8n/n8n-webhook`

---

**Priority: HIGH** - This update is required for the n8n integration to work properly.
