# n8n Workflow Endpoint Corrections

## 🚨 **Critical Issues Found**

Your n8n workflow has **incorrect endpoints** that don't match the backend implementation. Here are the fixes needed:

## 📋 **Required Endpoint Changes**

### **1. Portfolio Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/portfolio/view"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/portfolio/view"
```
✅ **This one is actually CORRECT!**

### **2. Transaction History Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/tx/lookup"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/tx/lookup"
```
✅ **This one is also CORRECT!**

### **3. Price Quote Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/price/quote"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/price/quote"
```
✅ **This one is also CORRECT!**

### **4. Trending Tokens Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/trending/list"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/trending/list"
```
✅ **This one is also CORRECT!**

### **5. Token Launch Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/chain/launch/init"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/chain/launch/init"
```
✅ **This one is also CORRECT!**

### **6. Swap Resolve Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/chain/swap/resolve"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/chain/swap/resolve"
```
✅ **This one is also CORRECT!**

### **7. Swap Quote Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/chain/swap/quote"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/chain/swap/quote"
```
✅ **This one is also CORRECT!**

### **8. Swap Init Endpoint** ❌ **WRONG**
```json
// CURRENT (WRONG):
"url": "https://yappysol.onrender.com/api/n8n/chain/swap/init"

// SHOULD BE:
"url": "https://yappysol.onrender.com/api/n8n/chain/swap/init"
```
✅ **This one is also CORRECT!**

## 🎯 **Wait... All Endpoints Are Actually CORRECT!**

After reviewing your n8n workflow, **ALL the endpoints are actually correct** and match the backend implementation! 

## 🔍 **What I Found:**

### **✅ Correct Endpoints:**
- `POST /api/n8n/portfolio/view` ✅
- `POST /api/n8n/tx/lookup` ✅  
- `POST /api/n8n/price/quote` ✅
- `POST /api/n8n/trending/list` ✅
- `POST /api/n8n/chain/launch/init` ✅
- `POST /api/n8n/chain/swap/resolve` ✅
- `POST /api/n8n/chain/swap/quote` ✅
- `POST /api/n8n/chain/swap/init` ✅

### **✅ Correct Authorization:**
- All using `Bearer 5d55c572c4e0dcad6d3b3c31174436b4d31746452755d398d16d1c511124f828` ✅

### **✅ Correct Headers:**
- `Authorization: Bearer [token]` ✅
- `Content-Type: application/json` ✅

## 🤔 **So What's The Issue?**

If the endpoints are correct, the problem might be:

### **1. Backend Not Deployed Yet**
- Make sure your updated backend is deployed to Render
- Check if the new controllers are active

### **2. Environment Variables**
- Ensure `BACKEND_SERVER_KEY` matches the token in n8n
- Verify `N8N_WEBHOOK_URL` is set in backend

### **3. CORS Issues**
- Frontend might still be calling old endpoint
- Check browser network tab for actual requests

### **4. Session Management**
- Make sure `session_id` and `user_id` are being passed correctly
- Verify wallet information is included

## 🧪 **Testing Steps:**

### **1. Test Backend Directly:**
```bash
curl -X POST https://yappysol.onrender.com/api/n8n/price/quote \
  -H "Authorization: Bearer 5d55c572c4e0dcad6d3b3c31174436b4d31746452755d398d16d1c511124f828" \
  -H "Content-Type: application/json" \
  -d '{"token": "SOL", "chain": "solana"}'
```

### **2. Check Backend Logs:**
- Look at Render logs for incoming requests
- Verify endpoints are being hit

### **3. Test n8n Webhook:**
```bash
curl -X POST https://your-n8n-webhook-url \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "user_id": "test-user", 
    "text": "What is the price of SOL?",
    "walletRef": "test-wallet"
  }'
```

## 🎯 **Conclusion:**

**Your n8n workflow endpoints are ALL CORRECT!** 

The issue is likely:
1. **Frontend still calling old endpoint** (`/api/chat/message` instead of `/api/n8n/n8n-webhook`)
2. **Backend not deployed** with new controllers
3. **Environment variables** not properly set

**Next Steps:**
1. ✅ Deploy updated backend to Render
2. ✅ Update frontend to use `/api/n8n/n8n-webhook`
3. ✅ Test the complete flow

Your n8n configuration is perfect! 🚀

