# Yappysol Frontend Implementation Guide - CORRECTED VERSION

## Overview
This document provides the **CORRECT** implementation guidance for the Yappysol frontend built on Lovable, based on the actual backend API structure.

## ✅ ACTUAL Backend API Structure

### 1. Chat Message Endpoint
**URL**: `POST /api/chat/message`
**Request Format**:
```typescript
{
  message: string,
  context?: {
    currentStep?: string,
    walletAddress?: string,
    previousMessages?: Array<{role: string, content: string}>
  },
  sessionId?: string
}
```

**Response Format**:
```typescript
{
  prompt: string,           // AI response message
  step?: string,           // Current step in multi-step flow
  action?: string,         // Action type (create-token, swap, etc.)
  unsignedTransaction?: string,  // For Pump.fun transactions
  mint?: string,           // Token mint address
  signature?: string,      // Transaction signature
  launchId?: string,       // Database record ID
  timestamp: string,       // Response timestamp
  context: object,         // Enhanced context
  sessionId?: string       // Session ID
}
```

### 2. Image Upload Endpoint
**URL**: `POST /api/chat/token-creation` ✅ **CORRECT PATH**
**Request Format**: FormData
```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('userId', userId);
```

**Response Format**:
```typescript
{
  prompt: string,    // Next step message
  step: string       // Next step ('twitter')
}
```

### 3. Session Management Endpoints
- `GET /api/chat/sessions` - Get all sessions
- `GET /api/chat/sessions/:id` - Get specific session
- `POST /api/chat/sessions` - Create new session
- `PUT /api/chat/sessions/:id` - Update session
- `POST /api/chat/sessions/:id/messages` - Add message to session

## 🔧 CORRECTED Frontend Implementation

### 1. Multi-Step Flow Tracking

```typescript
// CORRECTED: Track both flow type and step
const [currentFlow, setCurrentFlow] = useState<'launch' | 'swap' | null>(null);
const [currentStep, setCurrentStep] = useState<string | null>(null);

// CORRECTED: Detect flow type from step
const detectFlowType = (step: string): 'launch' | 'swap' | null => {
  const launchSteps = ['name', 'symbol', 'description', 'image', 'twitter', 'telegram', 'website', 'pool', 'amount', 'confirmation'];
  const swapSteps = ['fromToken', 'toToken', 'amount', 'confirmation'];
  
  if (launchSteps.includes(step)) return 'launch';
  if (swapSteps.includes(step)) return 'swap';
  return null;
};

// CORRECTED: Handle backend response
const handleBackendResponse = (response: any) => {
  // Update flow and step tracking
  if (response.step) {
    const flowType = detectFlowType(response.step);
    setCurrentFlow(flowType);
    setCurrentStep(response.step);
  }

  // Handle regular responses
  if (response.prompt) {
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: response.prompt 
    }]);
  }

  // Handle transactions (CORRECTED format)
  if (response.unsignedTransaction) {
    setShowTransaction(true);
    setPendingTransaction({
      transaction: response.unsignedTransaction,
      mint: response.mint,
      launchId: response.launchId,
      action: response.action
    });
  }

  // Handle completed transactions
  if (response.signature) {
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Transaction completed! Signature: ${response.signature}` 
    }]);
  }
};
```

### 2. CORRECTED Image Upload Implementation

```typescript
// CORRECTED: Use the actual endpoint path
const ImageUploadStep: React.FC<{
  onUploadComplete: (response: any) => void;
  onError: (error: string) => void;
}> = ({ onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      onError('Please upload an image file (PNG, JPG, GIF, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      onError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', getCurrentUserId());

      // CORRECTED: Use actual endpoint path
      const response = await fetch('/api/chat/token-creation', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      onUploadComplete(result);

    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ... rest of component implementation
};
```

### 3. CORRECTED Transaction Handling

```typescript
// CORRECTED: Handle actual backend response format
const TransactionPrompt: React.FC<{
  transaction: string;
  mint?: string;
  launchId?: string;
  action?: string;
  onSign: (transaction: string) => Promise<void>;
  onComplete: () => void;
}> = ({ transaction, mint, launchId, action, onSign, onComplete }) => {
  const [isSigning, setIsSigning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSign = async () => {
    setIsSigning(true);
    try {
      await onSign(transaction);
      setIsCompleted(true);
    } catch (error) {
      console.error('Transaction signing failed:', error);
      // Show error to user
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="transaction-prompt">
      <h3>Transaction Required</h3>
      
      {mint && (
        <div className="token-info">
          <p><strong>Token Address:</strong> <code>{mint}</code></p>
          <a 
            href={`https://solscan.io/token/${mint}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solscan
          </a>
        </div>
      )}

      {launchId && (
        <div className="launch-info">
          <p><strong>Launch ID:</strong> <code>{launchId}</code></p>
        </div>
      )}

      {!isCompleted && (
        <button 
          onClick={handleSign}
          disabled={isSigning}
          className="sign-transaction-btn"
        >
          {isSigning ? 'Signing...' : 'Sign Transaction'}
        </button>
      )}

      {isCompleted && (
        <button onClick={onComplete} className="continue-btn">
          Continue
        </button>
      )}
    </div>
  );
};

// CORRECTED: Wallet integration
const useWallet = () => {
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana) {
      setWallet(window.solana);
    }
  }, []);

  const signTransaction = async (unsignedTransaction: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    
    // Decode base64 transaction
    const transactionBytes = Uint8Array.from(atob(unsignedTransaction), c => c.charCodeAt(0));
    const transaction = Transaction.from(transactionBytes);
    
    // Sign with wallet
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // Send to network
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    return signature;
  };

  return { signTransaction, isConnected: !!wallet };
};
```

### 4. CORRECTED Chat Integration

```typescript
// CORRECTED: Main chat component with actual API structure
const ChatComponent: React.FC = () => {
  const [currentFlow, setCurrentFlow] = useState<'launch' | 'swap' | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [showTransaction, setShowTransaction] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const { signTransaction } = useWallet();

  const sendChatMessage = async (message: string, context: any = {}) => {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        message,
        context: {
          ...context,
          currentStep,
          walletAddress: getWalletAddress()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  };

  const handleSendMessage = async (message: string) => {
    try {
      // Add user message immediately
      setMessages(prev => [...prev, { role: 'user', content: message }]);

      const response = await sendChatMessage(message);
      handleBackendResponse(response);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }
  };

  const handleSignTransaction = async (transaction: string) => {
    try {
      const signature = await signTransaction(transaction);
      
      // CORRECTED: Send signature back to backend
      const response = await sendChatMessage(`Transaction signed: ${signature}`, {
        transactionSignature: signature,
        launchId: pendingTransaction.launchId
      });

      handleBackendResponse(response);
      setShowTransaction(false);
      setPendingTransaction(null);

    } catch (error) {
      console.error('Transaction signing failed:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Transaction signing failed. Please try again.' 
      }]);
    }
  };

  const cancelFlow = async () => {
    try {
      await sendChatMessage('cancel');
    } catch (error) {
      console.error('Error cancelling flow:', error);
    } finally {
      // Always reset frontend state
      setCurrentFlow(null);
      setCurrentStep(null);
      setMessages([]);
      setShowTransaction(false);
      setPendingTransaction(null);
    }
  };

  return (
    <div className="chat-container">
      {/* Flow Header */}
      {currentFlow && (
        <div className="flow-header">
          <h3>
            {currentFlow === 'launch' ? '🚀 Token Launch' : '🔄 Token Swap'}
            {currentStep && ` - Step: ${currentStep}`}
          </h3>
          <button onClick={cancelFlow} className="cancel-button">
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-container">
        {currentStep === 'image' && currentFlow === 'launch' ? (
          <ImageUploadStep
            onUploadComplete={(response) => {
              setCurrentStep(response.step);
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: response.prompt 
              }]);
            }}
            onError={(error) => {
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Upload error: ${error}. Please try again.` 
              }]);
            }}
          />
        ) : (
          <TextInput 
            onSend={handleSendMessage}
            placeholder={getStepPlaceholder(currentStep, currentFlow)}
          />
        )}
      </div>

      {/* Transaction Prompt */}
      {showTransaction && pendingTransaction && (
        <TransactionPrompt
          transaction={pendingTransaction.transaction}
          mint={pendingTransaction.mint}
          launchId={pendingTransaction.launchId}
          action={pendingTransaction.action}
          onSign={handleSignTransaction}
          onComplete={() => {
            setShowTransaction(false);
            setPendingTransaction(null);
          }}
        />
      )}
    </div>
  );
};
```

### 5. CORRECTED Step Validation

```typescript
// CORRECTED: Validation based on actual backend expectations
const validateStepInput = (input: string, step: string, flow: string): { isValid: boolean; error?: string } => {
  switch (step) {
    case 'symbol':
      if (!/^[A-Z]{3,10}$/.test(input)) {
        return { 
          isValid: false, 
          error: 'Token symbol must be 3-10 uppercase letters (e.g., BONK)' 
        };
      }
      break;

    case 'amount':
      const num = parseFloat(input);
      if (isNaN(num) || num <= 0) {
        return { 
          isValid: false, 
          error: 'Amount must be a positive number (e.g., 0.5)' 
        };
      }
      break;

    case 'twitter':
    case 'telegram':
    case 'website':
      if (input.toLowerCase() !== 'skip' && !isValidUrl(input)) {
        return { 
          isValid: false, 
          error: 'Please enter a valid URL or type "skip"' 
        };
      }
      break;

    case 'pool':
      if (!['pump', 'bonk'].includes(input.toLowerCase())) {
        return { 
          isValid: false, 
          error: 'Please type "pump" or "bonk"' 
        };
      }
      break;

    case 'fromToken':
    case 'toToken':
      if (!isValidTokenInput(input)) {
        return { 
          isValid: false, 
          error: 'Please enter a valid token symbol (e.g., SOL, USDC) or contract address' 
        };
      }
      break;

    default:
      break;
  }

  return { isValid: true };
};

const getStepPlaceholder = (step: string, flow: string): string => {
  const placeholders: Record<string, string> = {
    // Token Launch
    name: 'Enter token name (e.g., "My Awesome Token")',
    symbol: 'Enter token symbol (e.g., "MAT")',
    description: 'Describe your token',
    twitter: 'Enter Twitter URL or type "skip"',
    telegram: 'Enter Telegram URL or type "skip"',
    website: 'Enter website URL or type "skip"',
    pool: 'Choose pool type (pump/bonk)',
    amount: 'Enter launch amount in SOL',
    confirmation: 'Type "proceed" to launch or "cancel" to abort',
    
    // Token Swap
    fromToken: 'Enter source token (e.g., "SOL", "USDC", or contract address)',
    toToken: 'Enter destination token (e.g., "SOL", "USDC", or contract address)',
    amount: 'Enter amount to swap'
  };
  
  return placeholders[step] || 'Enter your response...';
};
```

## 📋 Implementation Checklist

### ✅ **CRITICAL - Must Implement**
- [ ] **Transaction Handling**: Handle `unsignedTransaction`, `mint`, `signature` fields
- [ ] **Flow Type Detection**: Track `launch` vs `swap` flows
- [ ] **Image Upload**: Use `/api/chat/token-creation` endpoint
- [ ] **Step Tracking**: Handle `step` field in responses

### ✅ **HIGH PRIORITY**
- [ ] **Response Format**: Use `prompt` field (not `response`)
- [ ] **Context Passing**: Include `currentStep` in requests
- [ ] **Session Management**: Handle `sessionId` properly

### ✅ **MEDIUM PRIORITY**
- [ ] **Step Validation**: Validate inputs before sending
- [ ] **Flow Cancellation**: Handle cancel messages
- [ ] **Error Handling**: Proper error display

## 🚨 Key Corrections Made

1. **Response Format**: Backend returns `prompt` not `response`
2. **Image Endpoint**: Correct path is `/api/chat/token-creation`
3. **Transaction Fields**: Backend returns `unsignedTransaction`, `mint`, `launchId`
4. **Step Field**: Backend includes `step` field in responses
5. **Action Field**: Backend includes `action` field for flow type

## 📝 Summary

This corrected guide aligns with your actual backend implementation. The key differences from the previous guide:

- ✅ Uses correct API endpoints and response formats
- ✅ Handles actual transaction fields returned by backend
- ✅ Properly tracks multi-step flows with `step` field
- ✅ Correct image upload implementation
- ✅ Accurate validation and error handling

The frontend team can now implement this with confidence that it matches your backend API structure.
