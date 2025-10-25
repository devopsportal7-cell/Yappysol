# 🎯 Frontend Implementation Guide for Lovable

## 📋 **Overview**

This guide covers the frontend changes needed for:
1. **External Wallet Deposit Balance System** - Real-time balance updates
2. **Smart Chat Modifications** - Enhanced intent detection and entity extraction

## 🚀 **1. External Wallet Deposit Balance System**

### **Required Frontend Changes**

#### **A. Real-time Balance Hook**
Create a new hook for real-time balance updates:

```typescript
// hooks/useWalletBalance.ts
import { useState, useEffect } from 'react';

export function useWalletBalance(walletAddress: string) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Initial fetch
    fetchBalance();
    
    // SSE connection for real-time updates
    const eventSource = new EventSource(`/api/wallet/${walletAddress}/events`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.reason === 'external_tx' || data.reason === 'cache_update') {
        // Refresh balance when external transaction detected
        fetchBalance();
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
    
    return () => {
      eventSource.close();
    };
  }, [walletAddress]);
  
  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet/${walletAddress}/balance`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };
  
  return { balance, loading, error, refetch: fetchBalance };
}
```

#### **B. Wallet Balance Component**
Create a component to display real-time balance:

```typescript
// components/WalletBalance.tsx
import React from 'react';
import { useWalletBalance } from '../hooks/useWalletBalance';

export const WalletBalance: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const { balance, loading, error, refetch } = useWalletBalance(walletAddress);
  
  if (loading) return <div>Loading balance...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!balance) return <div>No balance data</div>;
  
  return (
    <div className="wallet-balance">
      <h3>Wallet Balance</h3>
      <div className="totals">
        <div>SOL: {balance.totalSolValue.toFixed(4)}</div>
        <div>USD: ${balance.totalUsdValue.toFixed(2)}</div>
      </div>
      
      <div className="tokens">
        <h4>Tokens</h4>
        {balance.tokens.map(token => (
          <div key={token.mint} className="token">
            <span>{token.symbol}: {token.uiAmount.toFixed(4)}</span>
            <span>${token.usdEquivalent.toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <button onClick={refetch}>Refresh Balance</button>
    </div>
  );
};
```

#### **C. Transaction History Component**
Create a component for transaction history:

```typescript
// components/TransactionHistory.tsx
import React, { useState, useEffect } from 'react';

export const TransactionHistory: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTransactions();
  }, [walletAddress]);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet/${walletAddress}/history`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="transaction-history">
      <h3>Transaction History</h3>
      {loading ? (
        <div>Loading transactions...</div>
      ) : (
        <div className="transactions">
          {transactions.map((tx, index) => (
            <div key={index} className="transaction">
              <div className="tx-info">
                <span className="type">{tx.type}</span>
                <span className="amount">{tx.amount} {tx.tokenSymbol}</span>
                <span className="time">{new Date(tx.created_at || tx.block_time * 1000).toLocaleString()}</span>
              </div>
              {tx.solscan_url && (
                <a href={tx.solscan_url} target="_blank" rel="noopener noreferrer">
                  View on Solscan
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### **Integration Points**

#### **A. Portfolio Page Integration**
Update the portfolio page to use real-time balance:

```typescript
// pages/Portfolio.tsx (modify existing)
import { useWalletBalance } from '../hooks/useWalletBalance';
import { TransactionHistory } from '../components/TransactionHistory';

export const Portfolio: React.FC = () => {
  const userWallet = getUserWallet(); // Your existing wallet logic
  const { balance, loading, error } = useWalletBalance(userWallet.address);
  
  return (
    <div className="portfolio">
      <WalletBalance walletAddress={userWallet.address} />
      <TransactionHistory walletAddress={userWallet.address} />
    </div>
  );
};
```

#### **B. Dashboard Integration**
Update dashboard to show real-time balance:

```typescript
// components/DashboardLayout.tsx (modify existing)
import { useWalletBalance } from '../hooks/useWalletBalance';

export const DashboardLayout: React.FC = ({ children }) => {
  const userWallet = getUserWallet();
  const { balance } = useWalletBalance(userWallet.address);
  
  return (
    <div className="dashboard">
      <div className="balance-summary">
        <div>Total SOL: {balance?.totalSolValue.toFixed(4) || '0.0000'}</div>
        <div>Total USD: ${balance?.totalUsdValue.toFixed(2) || '0.00'}</div>
      </div>
      {children}
    </div>
  );
};
```

## 🧠 **2. Smart Chat Modifications**

### **Required Frontend Changes**

#### **A. Enhanced Chat Response Handling**
Update the chat component to handle smart multi-step flows:

```typescript
// components/Chat.tsx (modify existing)
export const Chat: React.FC = () => {
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [currentFlow, setCurrentFlow] = useState(null);
  
  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          message,
          context: {
            currentStep,
            currentFlow
          }
        })
      });
      
      const data = await response.json();
      
      // Handle smart multi-step flows
      if (data.step) {
        setCurrentStep(data.step);
        setCurrentFlow(data.action);
      } else {
        setCurrentStep(null);
        setCurrentFlow(null);
      }
      
      // Handle different response types
      if (data.action === 'swap' && data.unsignedTransaction) {
        // Handle swap transaction
        handleSwapTransaction(data);
      } else if (data.action === 'create-token' && data.unsignedTransaction) {
        // Handle token creation transaction
        handleTokenCreation(data);
      } else {
        // Regular chat response
        addMessage(data.prompt, 'assistant');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleSwapTransaction = (data: any) => {
    // Show swap confirmation UI
    addMessage(data.prompt, 'assistant');
    // Add transaction signing UI
    showTransactionSigning(data.unsignedTransaction, data.swapDetails);
  };
  
  const handleTokenCreation = (data: any) => {
    // Show token creation confirmation UI
    addMessage(data.prompt, 'assistant');
    // Add transaction signing UI
    showTransactionSigning(data.unsignedTransaction, data.tokenDetails);
  };
  
  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        {currentStep && (
          <div className="current-step">
            <span>Step: {currentStep}</span>
            <button onClick={() => setCurrentStep(null)}>Cancel</button>
          </div>
        )}
        
        <input
          type="text"
          placeholder={getInputPlaceholder(currentStep)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
};

const getInputPlaceholder = (step: string | null): string => {
  switch (step) {
    case 'fromToken': return 'Enter source token (e.g., "SOL", "USDC")';
    case 'toToken': return 'Enter destination token (e.g., "USDC", "BONK")';
    case 'amount': return 'Enter amount to swap';
    case 'confirmation': return 'Type "proceed" to confirm or "cancel" to abort';
    default: return 'Enter your message...';
  }
};
```

#### **B. Transaction Signing Component**
Create a component for transaction signing:

```typescript
// components/TransactionSigning.tsx
import React, { useState } from 'react';

export const TransactionSigning: React.FC<{
  unsignedTransaction: string;
  details: any;
  onSign: (signedTx: string) => void;
  onCancel: () => void;
}> = ({ unsignedTransaction, details, onSign, onCancel }) => {
  const [signing, setSigning] = useState(false);
  
  const handleSign = async () => {
    try {
      setSigning(true);
      // Your existing transaction signing logic
      const signedTx = await signTransaction(unsignedTransaction);
      onSign(signedTx);
    } catch (error) {
      console.error('Error signing transaction:', error);
    } finally {
      setSigning(false);
    }
  };
  
  return (
    <div className="transaction-signing">
      <h3>Confirm Transaction</h3>
      <div className="transaction-details">
        {details.fromToken && (
          <div>From: {details.amount} {details.fromToken}</div>
        )}
        {details.toToken && (
          <div>To: {details.toToken}</div>
        )}
        {details.tokenName && (
          <div>Token: {details.tokenName}</div>
        )}
      </div>
      
      <div className="actions">
        <button onClick={handleSign} disabled={signing}>
          {signing ? 'Signing...' : 'Sign Transaction'}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};
```

#### **C. Enhanced Message Types**
Update message types to handle new response formats:

```typescript
// types/chat.ts (modify existing)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    step?: string;
    unsignedTransaction?: string;
    swapDetails?: any;
    tokenDetails?: any;
  };
}

export interface ChatResponse {
  prompt: string;
  action?: string;
  step?: string;
  unsignedTransaction?: string;
  requireSignature?: boolean;
  swapDetails?: any;
  tokenDetails?: any;
}
```

## 🔧 **3. Implementation Checklist**

### **Balance Update System**
- [ ] Create `useWalletBalance` hook
- [ ] Create `WalletBalance` component
- [ ] Create `TransactionHistory` component
- [ ] Update Portfolio page to use real-time balance
- [ ] Update Dashboard to show real-time balance
- [ ] Test SSE connections
- [ ] Test balance refresh functionality

### **Smart Chat Modifications**
- [ ] Update Chat component to handle multi-step flows
- [ ] Create `TransactionSigning` component
- [ ] Update message types
- [ ] Handle different response actions (swap, create-token)
- [ ] Test smart entity extraction
- [ ] Test multi-step flow skipping
- [ ] Test transaction signing flow

## 🚀 **4. Key Benefits**

### **Balance Update System**
- ✅ **Real-time Updates**: Instant balance updates when external deposits are detected
- ✅ **SSE Integration**: Server-sent events for live updates
- ✅ **Transaction History**: Complete transaction tracking
- ✅ **Performance**: Cached balance data with smart refresh

### **Smart Chat Modifications**
- ✅ **Intelligent Flows**: Skips completed steps, asks only what's missing
- ✅ **Entity Extraction**: Understands natural language inputs
- ✅ **Direct Confirmation**: Goes straight to confirmation when all info is available
- ✅ **Transaction Signing**: Seamless transaction execution

## 📝 **5. Testing Instructions**

### **Balance Update Testing**
1. Send external deposit to user wallet
2. Verify balance updates in real-time
3. Check transaction history updates
4. Test SSE connection stability

### **Smart Chat Testing**
1. Test complete swap request: "I want to swap 5 USDC for SOL"
2. Test partial swap request: "swap USDC for SOL"
3. Test token creation: "create MyToken"
4. Verify step skipping works correctly
5. Test transaction signing flow

## 🎯 **Summary**

**Lovable needs to implement:**

1. **Real-time Balance System**:
   - `useWalletBalance` hook with SSE
   - `WalletBalance` component
   - `TransactionHistory` component
   - Integration with Portfolio and Dashboard

2. **Smart Chat Enhancements**:
   - Enhanced Chat component for multi-step flows
   - `TransactionSigning` component
   - Updated message types
   - Smart step handling

**No breaking changes required** - all modifications are additive and enhance existing functionality! 🚀✨