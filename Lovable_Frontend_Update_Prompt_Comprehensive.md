# 🚀 **COMPREHENSIVE FRONTEND UPDATE PROMPT FOR LOVABLE**

## **Overview**
This prompt covers ALL recent backend changes that require frontend updates. Implement these changes to ensure the frontend works correctly with the enhanced backend functionality.

---

## **1. 🔐 ENHANCED LOGIN RESPONSE (CRITICAL)**

### **What Changed**
The login endpoints now return comprehensive wallet and portfolio data instead of just basic user info.

### **Updated Login Response Format**
```typescript
// OLD Response (what you currently expect):
{
  message: 'Login successful',
  user: {
    id: string,
    email: string,
    username: string | null,
    onboardingCompleted: boolean,
    createdAt: string,
    solBalance: 0  // ❌ This was hardcoded
  },
  token: string
}

// NEW Response (what backend now returns):
{
  message: 'Login successful',
  user: {
    id: string,
    email: string,
    username: string | null,
    onboardingCompleted: boolean,
    createdAt: string,
    wallets: [  // ✅ NEW: Array of user wallets
      {
        id: string,
        publicKey: string,
        balance: number,  // SOL balance
        isImported: boolean,
        isDefault: boolean
      }
    ],
    portfolio: [  // ✅ NEW: Complete token portfolio
      {
        symbol: string,        // e.g., "SOL", "USDC"
        mint: string,          // Token contract address
        price: number,         // USD price per token
        image: string,         // Token image URL
        solscanUrl: string,    // Solscan link
        balance: number,       // Token balance
        balanceUsd: number     // USD value of balance
      }
    ] | null
  },
  token: string
}
```

### **Frontend Changes Required**

#### **A. Update Login State Management**
```typescript
// Update your user state interface
interface User {
  id: string;
  email: string;
  username: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  wallets: WalletInfo[];      // ✅ ADD THIS
  portfolio: TokenBalance[] | null;  // ✅ ADD THIS
}

interface WalletInfo {
  id: string;
  publicKey: string;
  balance: number;
  isImported: boolean;
  isDefault: boolean;
}

interface TokenBalance {
  symbol: string;
  mint: string;
  price: number;
  image: string;
  solscanUrl: string;
  balance: number;
  balanceUsd: number;
}
```

#### **B. Update Login Handler**
```typescript
// Update your login function to handle new response
const handleLogin = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.user) {
    // ✅ Store the complete user data including wallets and portfolio
    setUser(data.user);
    setToken(data.token);
    
    // ✅ You now have immediate access to:
    // - data.user.wallets (array of user wallets)
    // - data.user.portfolio (complete token portfolio with USD values)
    
    // No need for separate API calls to get wallet/portfolio data!
  }
};
```

#### **C. Update Dashboard/Portfolio Display**
```typescript
// You can now display portfolio immediately after login
const Dashboard = () => {
  const { user } = useAuth();
  
  // ✅ Portfolio data is already available in user.portfolio
  const totalUsdValue = user?.portfolio?.reduce((sum, token) => 
    sum + token.balanceUsd, 0) || 0;
  
  return (
    <div>
      <h2>Portfolio Value: ${totalUsdValue.toFixed(2)}</h2>
      
      {/* ✅ Display all tokens from user.portfolio */}
      {user?.portfolio?.map(token => (
        <div key={token.mint}>
          <img src={token.image} alt={token.symbol} />
          <span>{token.symbol}: {token.balance}</span>
          <span>${token.balanceUsd.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};
```

---

## **2. 💰 EXTERNAL BALANCE SYSTEM (NEW)**

### **What's New**
Real-time balance updates when users receive external deposits (from other wallets).

### **API Endpoints Available**
```typescript
// Get wallet balance (cached for performance)
GET /api/wallet/:address/balance
Response: {
  success: true,
  data: {
    totalSolValue: number,
    totalUsdValue: number,
    tokens: TokenBalance[]
  }
}

// Get transaction history (internal + external)
GET /api/wallet/:address/history?page=1&limit=50
Response: {
  success: true,
  data: [
    {
      type: 'internal' | 'external',
      signature: string,
      amount: number,
      tokenSymbol: string,
      sender: string,
      recipient: string,
      timestamp: number,
      solscanUrl: string
    }
  ]
}

// Real-time updates via Server-Sent Events
GET /api/wallet/:address/events
// Returns real-time balance updates when external deposits occur
```

### **Frontend Implementation**

#### **A. Real-Time Balance Updates**
```typescript
// Hook for real-time balance updates
const useWalletBalance = (walletAddress: string) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Initial fetch
    fetchBalance();
    
    // ✅ SSE connection for real-time updates
    const eventSource = new EventSource(`/api/wallet/${walletAddress}/events`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.reason === 'external_tx' || data.reason === 'cache_update') {
        // ✅ Refresh balance when external transaction detected
        fetchBalance();
        
        // ✅ Show notification to user
        toast.success(`Received ${data.metadata?.amount} ${data.metadata?.tokenSymbol}!`);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
    
    return () => eventSource.close();
  }, [walletAddress]);
  
  const fetchBalance = async () => {
    const response = await fetch(`/api/wallet/${walletAddress}/balance`);
    const data = await response.json();
    if (data.success) {
      setBalance(data.data);
    }
  };
  
  return { balance, loading, refetch: fetchBalance };
};
```

#### **B. Transaction History Display**
```typescript
const TransactionHistory = ({ walletAddress }: { walletAddress: string }) => {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    fetchTransactions();
  }, [walletAddress]);
  
  const fetchTransactions = async () => {
    const response = await fetch(`/api/wallet/${walletAddress}/history?page=1&limit=50`);
    const data = await response.json();
    if (data.success) {
      setTransactions(data.data);
    }
  };
  
  return (
    <div>
      <h3>Transaction History</h3>
      {transactions.map(tx => (
        <div key={tx.signature}>
          <span>{tx.type === 'external' ? '📥 External Deposit' : '🔄 Internal'}</span>
          <span>{tx.amount} {tx.tokenSymbol}</span>
          <a href={tx.solscanUrl} target="_blank">View on Solscan</a>
        </div>
      ))}
    </div>
  );
};
```

---

## **3. 🔄 ENHANCED SWAP FLOW (IMPROVED)**

### **What's Improved**
The swap flow is now smarter and skips steps when information is already provided.

### **Smart Entity Detection**
```typescript
// ✅ The AI now intelligently extracts entities from natural language
// Examples that now work better:

"swap 1 SOL for USDC" 
// ✅ AI extracts: fromToken="SOL", toToken="USDC", amount=1
// ✅ Skips asking for fromToken, toToken, amount
// ✅ Goes directly to confirmation

"buy 100 USDC with SOL"
// ✅ AI extracts: fromToken="SOL", toToken="USDC", amount=100
// ✅ Skips asking for missing information

"swap BONK to SOL"
// ✅ AI extracts: fromToken="BONK", toToken="SOL"
// ✅ Only asks for amount
```

### **Frontend Changes**
```typescript
// ✅ No changes needed to your existing swap flow!
// The backend now handles smart entity extraction automatically
// Your existing chat interface will work better without modifications

// Optional: You can show better loading states
const SwapFlow = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSwapMessage = async (message: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: { userId } })
      });
      
      const data = await response.json();
      
      // ✅ The response will now be smarter about skipping steps
      // when entities are already provided
      
    } finally {
      setIsProcessing(false);
    }
  };
};
```

---

## **4. 🎯 ONBOARDING STATE MANAGEMENT (IMPORTANT)**

### **What's Available**
Backend now provides an endpoint to check user's current onboarding status.

### **API Endpoint**
```typescript
GET /api/user/onboarding/status
Response: {
  success: true,
  data: {
    currentStep: 'username' | 'password' | 'privateKey' | 'complete',
    completedSteps: string[],
    totalSteps: number
  }
}
```

### **Frontend Implementation**
```typescript
// Check onboarding status on app load
const useOnboardingStatus = () => {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    fetchOnboardingStatus();
  }, []);
  
  const fetchOnboardingStatus = async () => {
    const response = await fetch('/api/user/onboarding/status');
    const data = await response.json();
    if (data.success) {
      setStatus(data.data);
    }
  };
  
  return { status, refetch: fetchOnboardingStatus };
};

// Use in your onboarding component
const OnboardingFlow = () => {
  const { status } = useOnboardingStatus();
  
  if (!status) return <div>Loading...</div>;
  
  // ✅ Skip to current step instead of starting from beginning
  if (status.currentStep === 'complete') {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <div>
      <h2>Step {status.completedSteps.length + 1} of {status.totalSteps}</h2>
      
      {status.currentStep === 'username' && <UsernameStep />}
      {status.currentStep === 'password' && <PasswordStep />}
      {status.currentStep === 'privateKey' && <PrivateKeyStep />}
    </div>
  );
};
```

---

## **5. 🔧 PRIVATE KEY EXPORT (NEW FEATURE)**

### **What's Available**
Users can now export their private keys from the settings page.

### **API Endpoints**
```typescript
// List user wallets
GET /api/user/private-keys
Response: {
  success: true,
  data: [
    {
      id: string,
      publicKey: string,
      isImported: boolean,
      isDefault: boolean
    }
  ]
}

// Export specific wallet's private key
POST /api/user/private-keys/export
Body: {
  walletId: string,
  password: string  // User's app password
}
Response: {
  success: true,
  data: {
    privateKey: string,
    walletAddress: string
  }
}
```

### **Frontend Implementation**
```typescript
const PrivateKeyExport = () => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  
  useEffect(() => {
    fetchWallets();
  }, []);
  
  const fetchWallets = async () => {
    const response = await fetch('/api/user/private-keys');
    const data = await response.json();
    if (data.success) {
      setWallets(data.data);
    }
  };
  
  const exportPrivateKey = async () => {
    const response = await fetch('/api/user/private-keys/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId: selectedWallet,
        password: password
      })
    });
    
    const data = await response.json();
    if (data.success) {
      setPrivateKey(data.data.privateKey);
    }
  };
  
  return (
    <div>
      <h3>Export Private Key</h3>
      
      <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)}>
        {wallets.map(wallet => (
          <option key={wallet.id} value={wallet.id}>
            {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
            {wallet.isDefault ? ' (Default)' : ''}
          </option>
        ))}
      </select>
      
      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <button onClick={exportPrivateKey}>Export Private Key</button>
      
      {privateKey && (
        <div>
          <h4>Private Key:</h4>
          <textarea value={privateKey} readOnly />
          <button onClick={() => navigator.clipboard.writeText(privateKey)}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## **6. 🚨 CRITICAL FIXES NEEDED**

### **A. Remove Hardcoded solBalance**
```typescript
// ❌ REMOVE THIS from your login handler:
solBalance: 0

// ✅ REPLACE WITH:
// The balance is now in user.wallets[0].balance and user.portfolio
```

### **B. Update Portfolio Display**
```typescript
// ❌ DON'T make separate API calls for portfolio after login
// ✅ USE the portfolio data from login response

// Instead of:
const portfolio = await fetch('/api/portfolio/wallet-address');

// Use:
const portfolio = user.portfolio; // Already available from login!
```

### **C. Handle Multiple Wallets**
```typescript
// ✅ Your user now has multiple wallets
// Update your wallet selection logic

const WalletSelector = ({ user }: { user: User }) => {
  const [selectedWallet, setSelectedWallet] = useState(user.wallets[0]?.publicKey);
  
  return (
    <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)}>
      {user.wallets.map(wallet => (
        <option key={wallet.id} value={wallet.publicKey}>
          {wallet.publicKey.slice(0, 8)}...{wallet.publicKey.slice(-8)}
          {wallet.isDefault ? ' (Default)' : ''}
        </option>
      ))}
    </select>
  );
};
```

---

## **7. 📱 IMPLEMENTATION CHECKLIST**

### **✅ Required Changes**
- [ ] Update login response handling to use `user.wallets` and `user.portfolio`
- [ ] Remove hardcoded `solBalance: 0` from login state
- [ ] Update portfolio display to use data from login response
- [ ] Implement real-time balance updates via SSE
- [ ] Add transaction history display
- [ ] Update onboarding flow to check current step
- [ ] Add private key export functionality
- [ ] Handle multiple wallets in wallet selector

### **✅ Optional Enhancements**
- [ ] Add loading states for balance updates
- [ ] Show notifications for external deposits
- [ ] Add wallet switching functionality
- [ ] Implement balance refresh button
- [ ] Add transaction filtering (internal vs external)

---

## **8. 🎯 PRIORITY ORDER**

1. **HIGH PRIORITY**: Fix login response handling (remove hardcoded solBalance)
2. **HIGH PRIORITY**: Update portfolio display to use login data
3. **MEDIUM PRIORITY**: Implement real-time balance updates
4. **MEDIUM PRIORITY**: Add transaction history
5. **LOW PRIORITY**: Add private key export feature

---

## **9. 🧪 TESTING**

### **Test Cases**
1. **Login**: Verify wallets and portfolio data are loaded correctly
2. **Balance Updates**: Test SSE connection for real-time updates
3. **Transaction History**: Verify internal and external transactions display
4. **Onboarding**: Test skipping to current step
5. **Private Key Export**: Test password verification and key export

### **Expected Behavior**
- Login should immediately show complete portfolio
- External deposits should trigger real-time balance updates
- Transaction history should show both internal and external transactions
- Onboarding should skip completed steps
- Private key export should work with password verification

---

## **10. 🚀 SUMMARY**

**The main changes are:**
1. **Enhanced Login**: Now includes wallets and portfolio data
2. **Real-Time Balance**: SSE updates for external deposits
3. **Smart Swap Flow**: Better entity extraction (no frontend changes needed)
4. **Onboarding Management**: Skip to current step
5. **Private Key Export**: New settings feature

**Most Important**: Update your login handler to use the new response format and remove hardcoded balance values. Everything else builds on this foundation.

---

**Questions?** The backend is fully implemented and tested. Focus on updating the frontend to handle the enhanced login response and real-time balance updates.
