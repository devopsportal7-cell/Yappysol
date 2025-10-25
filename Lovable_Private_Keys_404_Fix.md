# 🔧 Lovable Frontend Fix: Private Keys 404 Error

## 🚨 **URGENT FIX NEEDED**

The frontend is getting a **404 error** when trying to access `/api/user/private-keys`. This is because the backend endpoint wasn't properly deployed.

## ✅ **Backend Status**

**The backend endpoints are now FIXED and ready:**

### **Available Endpoints:**

1. **GET `/api/user/private-keys`** - List user wallets
2. **POST `/api/user/private-keys/export`** - Export specific wallet private key

## 🔧 **Frontend Implementation**

### **1. List Wallets Endpoint**

```typescript
// GET /api/user/private-keys
const fetchWallets = async () => {
  try {
    const response = await fetch('/api/user/private-keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    throw error;
  }
};

// Expected Response:
{
  "success": true,
  "wallets": [
    {
      "id": "wallet123",
      "publicKey": "7Ta9Z4...Nau1FQ",
      "createdAt": "2024-01-01T00:00:00Z",
      "isImported": false
    }
  ]
}
```

### **2. Export Private Key Endpoint**

```typescript
// POST /api/user/private-keys/export
const exportPrivateKey = async (walletId: string, password: string) => {
  try {
    const response = await fetch('/api/user/private-keys/export', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletId: walletId,
        password: password
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exporting private key:', error);
    throw error;
  }
};

// Expected Response:
{
  "success": true,
  "wallet": {
    "id": "wallet123",
    "publicKey": "7Ta9Z4...Nau1FQ",
    "privateKey": "actual_private_key_here",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Private key exported successfully. Keep it secure!"
}
```

## 🎯 **Error Handling**

### **Common Error Responses:**

```typescript
// No wallets found
{
  "success": false,
  "error": "NO_WALLETS_FOUND",
  "message": "No wallets found for this user"
}

// Invalid password
{
  "success": false,
  "error": "INVALID_PASSWORD", 
  "message": "Invalid password"
}

// Wallet not found
{
  "success": false,
  "error": "WALLET_NOT_FOUND",
  "message": "Wallet not found"
}

// Access denied
{
  "success": false,
  "error": "ACCESS_DENIED",
  "message": "Access denied to this wallet"
}
```

## 🔐 **Security Requirements**

1. **Authentication Required**: All endpoints require JWT token
2. **Password Verification**: Private key export requires user's app password
3. **User Ownership**: Users can only access their own wallets

## 📱 **Frontend Component Example**

```typescript
const PrivateKeyExport = () => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Load wallets on component mount
  useEffect(() => {
    const loadWallets = async () => {
      try {
        const data = await fetchWallets();
        setWallets(data.wallets);
      } catch (error) {
        console.error('Failed to load wallets:', error);
      }
    };
    loadWallets();
  }, []);

  const handleExport = async () => {
    if (!selectedWallet || !password) return;
    
    setLoading(true);
    try {
      const data = await exportPrivateKey(selectedWallet, password);
      setPrivateKey(data.wallet.privateKey);
      setPassword(''); // Clear password for security
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error (show toast, etc.)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Export Private Keys</h3>
      
      {/* Wallet Selection */}
      <select 
        value={selectedWallet} 
        onChange={(e) => setSelectedWallet(e.target.value)}
      >
        <option value="">Select a wallet</option>
        {wallets.map(wallet => (
          <option key={wallet.id} value={wallet.id}>
            {wallet.publicKey} {wallet.isImported ? '(Imported)' : '(Generated)'}
          </option>
        ))}
      </select>

      {/* Password Input */}
      <input
        type="password"
        placeholder="Enter your app password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* Export Button */}
      <button 
        onClick={handleExport}
        disabled={!selectedWallet || !password || loading}
      >
        {loading ? 'Exporting...' : 'Export Private Key'}
      </button>

      {/* Display Private Key */}
      {privateKey && (
        <div>
          <h4>Private Key:</h4>
          <textarea 
            value={privateKey} 
            readOnly 
            rows={3}
            style={{ width: '100%' }}
          />
          <button onClick={() => navigator.clipboard.writeText(privateKey)}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};
```

## 🚀 **Next Steps**

1. **Update API calls** to use the correct endpoints
2. **Test the endpoints** with proper authentication
3. **Handle error cases** gracefully
4. **Add loading states** for better UX
5. **Clear sensitive data** (passwords) after use

## ⚠️ **Important Notes**

- **Backend is now deployed** with the fixed endpoints
- **Authentication is required** for all calls
- **Password verification** is mandatory for private key export
- **Error handling** should be comprehensive
- **Security**: Clear passwords from memory after use

---

**The 404 error should be resolved once you update the frontend to use these correct endpoints!** 🎉
