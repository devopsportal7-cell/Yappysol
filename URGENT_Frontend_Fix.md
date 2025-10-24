# URGENT: Frontend Fix for Yappysol

## 🚨 **CRITICAL ISSUE**
The frontend is still calling the broken n8n webhook endpoint. Need to revert to the original working endpoint immediately.

## ⚡ **QUICK FIX**

### **1. Change API Endpoint**
Find this code in your frontend:
```typescript
// WRONG (causing errors):
fetch('/api/n8n/n8n-webhook', ...)

// CORRECT (working):
fetch('/api/chat/message', ...)
```

### **2. Change Request Body**
```typescript
// WRONG:
{
  "session_id": "session-uuid",
  "user_id": "user-uuid", 
  "text": "user message",
  "walletRef": "wallet_address"
}

// CORRECT:
{
  "message": "user message",
  "context": {
    "walletAddress": "wallet_address",
    "previousMessages": []
  },
  "sessionId": "session-uuid"
}
```

### **3. Change Response Handling**
```typescript
// WRONG:
data.message

// CORRECT:
data.response
```

## 🔍 **Where to Find This Code**

Look for files containing:
- `n8n-webhook`
- `session_id`
- `user_id`
- `text`
- `walletRef`

## ✅ **Expected Result**
After this fix:
- ✅ Chat messages work
- ✅ Price queries work  
- ✅ Portfolio works
- ✅ Swaps work
- ✅ No more 500 errors

## 🚀 **Priority: HIGH**
This needs to be fixed immediately to restore chat functionality.
