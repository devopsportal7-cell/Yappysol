# Yappysol Frontend Implementation Guide for Lovable

## Overview
This document provides specific implementation guidance for the Yappysol frontend built on Lovable. It focuses on frontend-specific functionality and integration patterns without duplicating backend logic.

## Critical Implementation Gaps

### 1. Multi-Step Flow Tracking (HIGH PRIORITY)

**Current Issue**: Frontend only tracks `currentStep` but doesn't know which flow type is active.

**Problem**: 
- Token Launch has 10 steps: `name → symbol → description → image → twitter → telegram → website → pool → amount → confirmation`
- Token Swap has 4 steps: `fromToken → toToken → amount → confirmation`
- Without flow type, frontend can't show correct placeholders, validation, or UI

**Implementation**:

```typescript
// Add flow type tracking
const [currentFlow, setCurrentFlow] = useState<'launch' | 'swap' | null>(null);
const [currentStep, setCurrentStep] = useState<string | null>(null);

// Detect flow type from backend response
const detectFlowType = (step: string): 'launch' | 'swap' | null => {
  const launchSteps = ['name', 'symbol', 'description', 'image', 'twitter', 'telegram', 'website', 'pool', 'amount', 'confirmation'];
  const swapSteps = ['fromToken', 'toToken', 'amount', 'confirmation'];
  
  if (launchSteps.includes(step)) return 'launch';
  if (swapSteps.includes(step)) return 'swap';
  return null;
};

// Update when receiving backend response
const handleBackendResponse = (response: any) => {
  if (response.step) {
    const flowType = detectFlowType(response.step);
    setCurrentFlow(flowType);
    setCurrentStep(response.step);
  }
};
```

**Benefits**:
- Show correct placeholder text per flow
- Display appropriate progress indicators
- Know when to show image upload UI (launch flow only)
- Validate inputs correctly per flow context

---

### 2. Transaction Handling (CRITICAL PRIORITY)

**Current Issue**: Backend returns transaction objects but frontend doesn't handle them.

**Problem**: Users can't complete token launches or swaps because transactions aren't processed.

**Implementation**:

```typescript
// Transaction handling component
interface TransactionPromptProps {
  transaction: string; // Base64 encoded unsigned transaction
  mint?: string; // For token launches
  signature?: string; // For completed transactions
  onSign: (transaction: string) => Promise<void>;
  onComplete: () => void;
}

const TransactionPrompt: React.FC<TransactionPromptProps> = ({
  transaction,
  mint,
  signature,
  onSign,
  onComplete
}) => {
  const [isSigning, setIsSigning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!signature);

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

      {signature && (
        <div className="transaction-complete">
          <p>✅ Transaction completed!</p>
          <p><strong>Signature:</strong> <code>{signature}</code></p>
          <a 
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Transaction
          </a>
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

// Integration with wallet (Phantom/Backpack)
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

// Usage in main chat component
const handleBackendResponse = async (response: any) => {
  // Handle regular responses
  if (response.prompt) {
    setMessages(prev => [...prev, { role: 'assistant', content: response.prompt }]);
  }

  // Handle transactions
  if (response.unsignedTransaction) {
    setShowTransaction(true);
    setPendingTransaction({
      transaction: response.unsignedTransaction,
      mint: response.mint,
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

**Required Dependencies**:
```json
{
  "@solana/web3.js": "^1.87.6",
  "@solana/wallet-adapter-base": "^0.9.23",
  "@solana/wallet-adapter-react": "^0.15.35",
  "@solana/wallet-adapter-react-ui": "^0.9.35"
}
```

---

### 3. Image Upload Implementation (MEDIUM PRIORITY)

**Current Issue**: Images sent as base64 in message context instead of using dedicated endpoint.

**Implementation**:

```typescript
// Image upload component for token launch
const ImageUploadStep: React.FC<{
  onUploadComplete: (response: any) => void;
  onError: (error: string) => void;
}> = ({ onUploadComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      formData.append('userId', getCurrentUserId()); // Get from auth context

      const response = await fetch('/api/chat/token-creation', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser handle multipart/form-data
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="image-upload-container">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="uploading-state">
            <div className="spinner"></div>
            <p>Uploading image...</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">📁</div>
            <p>Drop your token image here or click to browse</p>
            <p className="upload-hint">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
};

// Integration with main chat flow
const renderStepInput = () => {
  if (currentStep === 'image' && currentFlow === 'launch') {
    return (
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
    );
  }

  // Regular text input for other steps
  return <TextInput onSend={handleSendMessage} />;
};
```

---

### 4. Flow Cancellation (MEDIUM PRIORITY)

**Current Issue**: No way to cancel multi-step flows mid-way.

**Implementation**:

```typescript
const cancelFlow = async () => {
  try {
    // Notify backend to cancel
    await sendChatMessage({
      message: 'cancel',
      context: { currentStep }
    });

    // Reset frontend state
    setCurrentFlow(null);
    setCurrentStep(null);
    setMessages([]);
    setShowTransaction(false);
    setPendingTransaction(null);

  } catch (error) {
    console.error('Error cancelling flow:', error);
    // Still reset frontend state even if backend fails
    setCurrentFlow(null);
    setCurrentStep(null);
    setMessages([]);
  }
};

// UI with cancel button
const FlowHeader = () => {
  if (!currentFlow) return null;

  return (
    <div className="flow-header">
      <h3>
        {currentFlow === 'launch' ? '🚀 Token Launch' : '🔄 Token Swap'}
        {currentStep && ` - Step: ${currentStep}`}
      </h3>
      <button 
        onClick={cancelFlow}
        className="cancel-button"
        title="Cancel current flow"
      >
        ✕ Cancel
      </button>
    </div>
  );
};
```

---

### 5. Step-Specific Validation (MEDIUM PRIORITY)

**Current Issue**: All inputs treated the same, no validation before sending to backend.

**Implementation**:

```typescript
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

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidTokenInput = (input: string): boolean => {
  // Check if it's a valid Solana address (44 chars) or common token symbol
  const commonTokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH'];
  return commonTokens.includes(input.toUpperCase()) || 
         /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input);
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

// Enhanced text input with validation
const TextInput: React.FC<{
  onSend: (message: string) => void;
  isLoading: boolean;
}> = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    // Validate input
    const validation = validateStepInput(message.trim(), currentStep || '', currentFlow || '');
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid input');
      return;
    }

    setValidationError(null);
    onSend(message.trim());
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="text-input-form">
      {validationError && (
        <div className="validation-error">
          {validationError}
        </div>
      )}
      
      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setValidationError(null); // Clear error on typing
          }}
          placeholder={getStepPlaceholder(currentStep || '', currentFlow || '')}
          disabled={isLoading}
          className="text-input"
        />
        <button 
          type="submit"
          disabled={isLoading || !message.trim()}
          className="send-button"
        >
          {isLoading ? '⏳' : '➤'}
        </button>
      </div>
    </form>
  );
};
```

---

## Complete Integration Example

```typescript
// Main chat component integration
const ChatComponent: React.FC = () => {
  const [currentFlow, setCurrentFlow] = useState<'launch' | 'swap' | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [showTransaction, setShowTransaction] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const { signTransaction } = useWallet();

  const detectFlowType = (step: string): 'launch' | 'swap' | null => {
    const launchSteps = ['name', 'symbol', 'description', 'image', 'twitter', 'telegram', 'website', 'pool', 'amount', 'confirmation'];
    const swapSteps = ['fromToken', 'toToken', 'amount', 'confirmation'];
    
    if (launchSteps.includes(step)) return 'launch';
    if (swapSteps.includes(step)) return 'swap';
    return null;
  };

  const handleBackendResponse = async (response: any) => {
    // Update flow and step tracking
    if (response.step) {
      const flowType = detectFlowType(response.step);
      setCurrentFlow(flowType);
      setCurrentStep(response.step);
    }

    // Handle regular responses
    if (response.prompt) {
      setMessages(prev => [...prev, { role: 'assistant', content: response.prompt }]);
    }

    // Handle transactions
    if (response.unsignedTransaction) {
      setShowTransaction(true);
      setPendingTransaction({
        transaction: response.unsignedTransaction,
        mint: response.mint,
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

  const handleSignTransaction = async (transaction: string) => {
    try {
      const signature = await signTransaction(transaction);
      
      // Send signature back to backend
      await sendChatMessage({
        message: `Transaction signed: ${signature}`,
        context: { currentStep, transactionSignature: signature }
      });

      setShowTransaction(false);
      setPendingTransaction(null);
    } catch (error) {
      console.error('Transaction signing failed:', error);
      // Show error to user
    }
  };

  const cancelFlow = async () => {
    try {
      await sendChatMessage({
        message: 'cancel',
        context: { currentStep }
      });
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
      <FlowHeader />
      
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="input-container">
        {currentStep === 'image' && currentFlow === 'launch' ? (
          <ImageUploadStep
            onUploadComplete={handleBackendResponse}
            onError={(error) => {
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Upload error: ${error}. Please try again.` 
              }]);
            }}
          />
        ) : (
          <TextInput 
            onSend={async (message) => {
              const response = await sendChatMessage({
                message,
                context: { currentStep, currentFlow }
              });
              handleBackendResponse(response);
            }}
            isLoading={false}
          />
        )}
      </div>

      {showTransaction && pendingTransaction && (
        <TransactionPrompt
          transaction={pendingTransaction.transaction}
          mint={pendingTransaction.mint}
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

## CSS Styles

```css
/* Flow Header */
.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.flow-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.cancel-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button:hover {
  background: #c82333;
}

/* Image Upload */
.image-upload-container {
  width: 100%;
  margin: 16px 0;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
}

.upload-area:hover {
  border-color: #007bff;
  background-color: #f0f8ff;
}

.upload-area.drag-active {
  border-color: #007bff;
  background-color: #e6f3ff;
}

.upload-area.uploading {
  border-color: #28a745;
  background-color: #f0fff0;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-prompt p {
  margin: 8px 0;
  color: #666;
}

.upload-hint {
  font-size: 14px;
  color: #999;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Transaction Prompt */
.transaction-prompt {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  max-width: 500px;
  width: 90%;
  padding: 24px;
  z-index: 1000;
}

.transaction-prompt h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.token-info, .transaction-complete {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
}

.token-info code, .transaction-complete code {
  display: block;
  background: #e9ecef;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
  margin: 8px 0;
}

.sign-transaction-btn, .continue-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  margin-top: 16px;
}

.sign-transaction-btn:hover, .continue-btn:hover {
  background: #0056b3;
}

.sign-transaction-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Validation Error */
.validation-error {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #f5c6cb;
}

/* Text Input */
.text-input-form {
  width: 100%;
}

.input-container {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 16px;
  outline: none;
}

.text-input:focus {
  border-color: #007bff;
}

.send-button {
  padding: 12px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 16px;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.send-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
```

## Implementation Priority

1. **CRITICAL**: Transaction Handling - Users can't complete actions without this
2. **HIGH**: Multi-Step Flow Tracking - Needed for proper UX and validation
3. **MEDIUM**: Image Upload Endpoint - Improves efficiency for large files
4. **MEDIUM**: Flow Cancellation - Better user experience
5. **MEDIUM**: Step-Specific Validation - Reduces errors and improves UX

## Summary

This implementation focuses on frontend-specific functionality without duplicating backend logic. The key improvements are:

- **Flow Type Detection**: Know which flow is active for proper UI/validation
- **Transaction Processing**: Handle unsigned transactions and wallet integration
- **Efficient Image Upload**: Use dedicated endpoint instead of base64
- **Flow Management**: Cancel flows and reset state properly
- **Input Validation**: Validate inputs before sending to backend

These changes will significantly improve the user experience and make the app fully functional for token launches and swaps.
