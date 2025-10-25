# 🔗 Solana WebSocket Implementation - External Wallet Deposit System

## 📋 Overview

The WebSocket implementation has been updated to use the **proper Solana WebSocket format** instead of generic Helius format. This ensures compatibility with Solana's native WebSocket API and provides more accurate real-time monitoring.

## 🔧 Key Changes Made

### 1. **Solana WebSocket Message Format**

**Before (Generic):**
```json
{
  "type": "accountNotification",
  "account": "wallet_address",
  "slot": 12345
}
```

**After (Solana Native):**
```json
{
  "jsonrpc": "2.0",
  "method": "accountNotification",
  "params": {
    "subscription": 12345,
    "result": {
      "context": { "slot": 12345 },
      "value": { "lamports": 1000000000 }
    }
  }
}
```

### 2. **Subscription Management**

**Solana WebSocket Subscription:**
```typescript
const subscribeMessage = {
  jsonrpc: '2.0',
  id: subscriptionId,
  method: 'accountSubscribe',
  params: [
    walletAddress,
    {
      encoding: 'base64',
      commitment: 'confirmed'
    }
  ]
};
```

**Subscription Confirmation Handling:**
```typescript
// Handle subscription confirmation
if (message.id && message.result) {
  const requestId = message.id;
  const actualSubscriptionId = message.result;
  const walletAddress = this.getWalletByRequestId(requestId);
  
  if (walletAddress) {
    this.subscriptionIds.set(walletAddress, actualSubscriptionId);
  }
}
```

### 3. **Message Types Supported**

#### **Account Notifications**
- **Method**: `accountNotification`
- **Purpose**: Real-time account balance changes
- **Data**: Account info, lamports, slot number

#### **Transaction Logs**
- **Method**: `logsNotification`
- **Purpose**: Transaction log updates
- **Data**: Transaction signature, logs

#### **Signature Notifications**
- **Method**: `signatureNotification`
- **Purpose**: Transaction confirmation
- **Data**: Transaction signature, error status

### 4. **Enhanced Subscription Tracking**

```typescript
export class WebsocketBalanceSubscriber {
  private subscriptionIds = new Map<string, number>(); // wallet -> subscription ID
  private requestIdToWallet = new Map<number, string>(); // request ID -> wallet
  
  // Track subscription lifecycle
  async subscribeToWallet(walletAddress: string): Promise<boolean> {
    const subscriptionId = Date.now();
    
    // Store request ID mapping for confirmation
    this.requestIdToWallet.set(subscriptionId, walletAddress);
    
    // Send subscription request
    this.ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: subscriptionId,
      method: 'accountSubscribe',
      params: [walletAddress, { encoding: 'base64', commitment: 'confirmed' }]
    }));
  }
}
```

## 🎯 Benefits of Solana WebSocket Implementation

### 1. **Native Compatibility**
- ✅ Uses Solana's official WebSocket format
- ✅ Compatible with all Solana RPC providers
- ✅ Follows Solana WebSocket specification

### 2. **Better Performance**
- ✅ More efficient message parsing
- ✅ Reduced overhead with native format
- ✅ Better error handling

### 3. **Enhanced Reliability**
- ✅ Proper subscription ID management
- ✅ Accurate wallet-to-subscription mapping
- ✅ Better reconnection handling

### 4. **Comprehensive Monitoring**
- ✅ Account balance changes
- ✅ Transaction confirmations
- ✅ Transaction logs
- ✅ Error notifications

## 🔄 Message Flow

### 1. **Subscription Process**
```
1. Send accountSubscribe request with wallet address
2. Receive subscription confirmation with subscription ID
3. Map subscription ID to wallet address
4. Start receiving account notifications
```

### 2. **Account Change Detection**
```
1. Receive accountNotification message
2. Extract subscription ID and account info
3. Find wallet address by subscription ID
4. Check for external transactions
5. Trigger balance refresh
6. Send SSE notification to frontend
```

### 3. **Transaction Monitoring**
```
1. Receive signatureNotification for transaction
2. Extract transaction signature
3. Trigger balance refresh for affected wallets
4. Update transaction history
```

## 🛠️ Configuration

### Environment Variables
```bash
# Solana WebSocket Configuration
HELIUS_API_KEY=your_helius_api_key
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_WSS_URL=wss://api.helius.xyz/v0/websocket

# WebSocket Settings
WSS_MAX_RECONNECT_ATTEMPTS=10
WSS_RECONNECT_DELAY_MS=5000
```

### WebSocket Connection
```typescript
const wsUrl = `wss://api.helius.xyz/v0/websocket?api-key=${apiKey}`;
const ws = new WebSocket(wsUrl);
```

## 📊 Monitoring & Debugging

### Logging Examples
```typescript
// Subscription confirmation
logger.info('[WSS] Solana subscription confirmed', { 
  walletAddress,
  requestId, 
  subscriptionId 
});

// Account notification
logger.info('[WSS] Solana account notification received', { 
  wallet: walletAddress,
  subscriptionId,
  slot: accountInfo.context?.slot,
  lamports: accountInfo.value?.lamports
});

// Transaction signature
logger.info('[WSS] Solana signature notification received', { 
  subscriptionId,
  signature: signature.signature,
  err: signature.err
});
```

### Debug Commands
```bash
# Check WebSocket status
curl -H "Authorization: Bearer <token>" \
  https://your-api.com/api/wallet/websocket/status

# Subscribe to wallet
curl -X POST -H "Authorization: Bearer <token>" \
  https://your-api.com/api/wallet/7Ta9Z4...Nau1FQ/subscribe
```

## 🚀 Deployment Notes

### 1. **WebSocket Provider Requirements**
- Must support Solana WebSocket format
- Must provide account subscription capabilities
- Must handle high-frequency updates

### 2. **Rate Limiting Considerations**
- Solana WebSocket has higher rate limits than HTTP
- Monitor subscription count per connection
- Implement proper reconnection logic

### 3. **Error Handling**
- Handle WebSocket disconnections gracefully
- Implement exponential backoff for reconnections
- Monitor subscription health

## 🔍 Testing

### Manual Testing
```typescript
// Test subscription
const ws = new WebSocket('wss://api.helius.xyz/v0/websocket?api-key=YOUR_KEY');

ws.onopen = () => {
  // Subscribe to a wallet
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'accountSubscribe',
    params: ['WALLET_ADDRESS', { encoding: 'base64', commitment: 'confirmed' }]
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Integration Testing
- Test subscription confirmation
- Test account notifications
- Test reconnection logic
- Test multiple wallet subscriptions

## 📈 Performance Metrics

### Key Metrics to Monitor
1. **Subscription Success Rate** - Percentage of successful subscriptions
2. **Message Processing Time** - Time to process WebSocket messages
3. **Reconnection Frequency** - How often reconnections occur
4. **Subscription Count** - Number of active subscriptions
5. **Error Rate** - Percentage of failed WebSocket operations

### Optimization Tips
- Use connection pooling for multiple wallets
- Implement message batching for high-volume scenarios
- Monitor memory usage for subscription tracking
- Use proper cleanup on disconnection

---

**🎯 The Solana WebSocket implementation provides native compatibility, better performance, and enhanced reliability for real-time external wallet deposit detection!**
