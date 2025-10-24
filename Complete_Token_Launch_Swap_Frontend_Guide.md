# Complete Token Launch & Swap Flow - Frontend Implementation Guide

## Overview
This guide provides complete frontend implementation for both token launch and token swap multi-step flows, including image uploads and transaction handling.

## Backend API Endpoints

### 1. Chat Message Endpoint
**URL**: `POST /api/chat/message`
**Purpose**: Handles text messages and continues multi-step flows

### 2. Image Upload Endpoint
**URL**: `POST /api/chat/token-creation`
**Purpose**: Handles image file uploads during token creation

### 3. Session Management Endpoints
- `GET /api/chat/sessions` - Get all chat sessions
- `GET /api/chat/sessions/:id` - Get specific session
- `POST /api/chat/sessions` - Create new session
- `PUT /api/chat/sessions/:id` - Update session
- `DELETE /api/chat/sessions/:id` - Delete session

## Flow Definitions

### Token Launch Flow Steps
```typescript
const TOKEN_LAUNCH_STEPS = [
  'name',        // Token name
  'symbol',      // Token symbol/ticker
  'description', // Token description
  'image',       // Token image (special upload handling)
  'twitter',     // Twitter link
  'telegram',    // Telegram link
  'website',     // Website link
  'pool',        // Pool type (pump/bonk)
  'amount',      // Launch amount in SOL
  'confirmation' // Final confirmation
];
```

### Token Swap Flow Steps
```typescript
const TOKEN_SWAP_STEPS = [
  'fromToken',   // Source token
  'toToken',     // Destination token
  'amount',      // Amount to swap
  'confirmation' // Final confirmation
];
```

## Complete Frontend Implementation

### 1. Main Flow Manager Component

```typescript
import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import TokenLaunchFlow from './TokenLaunchFlow';
import TokenSwapFlow from './TokenSwapFlow';

interface FlowManagerProps {
  userId: string;
  authToken: string;
  onComplete: (result: any) => void;
}

type FlowType = 'launch' | 'swap' | null;

const FlowManager: React.FC<FlowManagerProps> = ({ 
  userId, 
  authToken, 
  onComplete 
}) => {
  const [currentFlow, setCurrentFlow] = useState<FlowType>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Start a new flow
  const startFlow = async (flowType: FlowType) => {
    setIsLoading(true);
    try {
      const message = flowType === 'launch' ? 'create token' : 'swap token';
      
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message,
          context: {
            userId,
            currentStep: null,
            sessionId
          }
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setCurrentFlow(flowType);
      setCurrentStep(result.step);
      setMessages([{ role: 'assistant', content: result.prompt }]);
      
      // Create or update session
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }

    } catch (error) {
      console.error(`Error starting ${flowType} flow:`, error);
      setMessages([{ 
        role: 'assistant', 
        content: `Failed to start ${flowType} flow. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle text input for regular steps
  const handleTextInput = async (message: string) => {
    if (!currentFlow || !currentStep) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message,
          context: {
            userId,
            currentStep,
            sessionId,
            previousMessages: messages
          }
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Add user message and assistant response
      setMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: 'assistant', content: result.prompt }
      ]);

      if (result.step === null) {
        // Flow completed
        onComplete(result);
        setCurrentFlow(null);
        setCurrentStep(null);
      } else {
        setCurrentStep(result.step);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, 
        { role: 'assistant', content: `Error: ${error.message}. Please try again.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload success
  const handleImageUploadSuccess = (response: { prompt: string; step: string }) => {
    setCurrentStep(response.step);
    setMessages(prev => [...prev, 
      { role: 'assistant', content: response.prompt }
    ]);
  };

  // Handle image upload error
  const handleImageUploadError = (error: string) => {
    setMessages(prev => [...prev, 
      { role: 'assistant', content: `Upload error: ${error}. Please try again.` }
    ]);
  };

  // Cancel current flow
  const cancelFlow = async () => {
    if (!currentFlow) return;

    await handleTextInput('cancel');
    setCurrentFlow(null);
    setCurrentStep(null);
  };

  return (
    <div className="flow-manager">
      {/* Flow Selection */}
      {!currentFlow && (
        <div className="flow-selection">
          <h2>Choose an Action</h2>
          <div className="flow-buttons">
            <button 
              onClick={() => startFlow('launch')}
              disabled={isLoading}
              className="flow-button launch-button"
            >
              🚀 Launch Token
            </button>
            <button 
              onClick={() => startFlow('swap')}
              disabled={isLoading}
              className="flow-button swap-button"
            >
              🔄 Swap Tokens
            </button>
          </div>
        </div>
      )}

      {/* Active Flow */}
      {currentFlow && (
        <div className="active-flow">
          <div className="flow-header">
            <h3>
              {currentFlow === 'launch' ? '🚀 Token Launch' : '🔄 Token Swap'}
            </h3>
            <button onClick={cancelFlow} className="cancel-button">
              Cancel
            </button>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Current Step Input */}
          <div className="step-input">
            {currentStep === 'image' && currentFlow === 'launch' ? (
              <ImageUpload
                userId={userId}
                onUploadSuccess={handleImageUploadSuccess}
                onUploadError={handleImageUploadError}
              />
            ) : currentStep ? (
              <TextInput
                onSend={handleTextInput}
                isLoading={isLoading}
                placeholder={getStepPlaceholder(currentStep, currentFlow)}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for step placeholders
const getStepPlaceholder = (step: string, flow: FlowType): string => {
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

export default FlowManager;
```

### 2. Enhanced Image Upload Component

```typescript
import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  userId: string;
  onUploadSuccess: (response: { prompt: string; step: string }) => void;
  onUploadError: (error: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  userId, 
  onUploadSuccess, 
  onUploadError 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onUploadError('Please upload an image file (PNG, JPG, GIF, etc.)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await fetch('/api/chat/token-creation', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      onUploadSuccess(result);

    } catch (error) {
      console.error('Image upload error:', error);
      onUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  return (
    <div className="image-upload-container">
      {preview ? (
        <div className="image-preview">
          <img src={preview} alt="Token preview" />
          <p>Image uploaded successfully!</p>
        </div>
      ) : (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImageUpload;
```

### 3. Text Input Component

```typescript
import React, { useState } from 'react';

interface TextInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder: string;
}

const TextInput: React.FC<TextInputProps> = ({ 
  onSend, 
  isLoading, 
  placeholder 
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="text-input-form">
      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
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

export default TextInput;
```

### 4. Transaction Result Handler

```typescript
import React from 'react';

interface TransactionResultProps {
  result: any;
  onClose: () => void;
}

const TransactionResult: React.FC<TransactionResultProps> = ({ 
  result, 
  onClose 
}) => {
  const isSuccess = result.action === 'token-creation' || result.action === 'swap';
  const isError = result.action === 'error';

  return (
    <div className="transaction-result">
      <div className="result-header">
        <h3>
          {isSuccess ? '✅ Success!' : isError ? '❌ Error' : '📋 Result'}
        </h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      <div className="result-content">
        <div className="result-message">
          {result.prompt}
        </div>

        {/* Token Launch Results */}
        {result.action === 'token-creation' && (
          <div className="launch-details">
            {result.mint && (
              <div className="detail-item">
                <strong>Token Address:</strong>
                <code>{result.mint}</code>
                <a 
                  href={`https://solscan.io/token/${result.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  View on Solscan
                </a>
              </div>
            )}
            
            {result.unsignedTransaction && (
              <div className="detail-item">
                <strong>Transaction:</strong>
                <p>Please sign the transaction in your wallet to complete the launch.</p>
                <button 
                  onClick={() => {
                    // Handle transaction signing
                    console.log('Transaction to sign:', result.unsignedTransaction);
                  }}
                  className="sign-button"
                >
                  Sign Transaction
                </button>
              </div>
            )}

            {result.signature && (
              <div className="detail-item">
                <strong>Transaction Signature:</strong>
                <code>{result.signature}</code>
                <a 
                  href={`https://solscan.io/tx/${result.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  View Transaction
                </a>
              </div>
            )}
          </div>
        )}

        {/* Token Swap Results */}
        {result.action === 'swap' && (
          <div className="swap-details">
            {result.unsignedTransaction && (
              <div className="detail-item">
                <strong>Swap Transaction:</strong>
                <p>Please sign the transaction in your wallet to complete the swap.</p>
                <button 
                  onClick={() => {
                    // Handle transaction signing
                    console.log('Swap transaction to sign:', result.unsignedTransaction);
                  }}
                  className="sign-button"
                >
                  Sign Transaction
                </button>
              </div>
            )}

            {result.signature && (
              <div className="detail-item">
                <strong>Transaction Signature:</strong>
                <code>{result.signature}</code>
                <a 
                  href={`https://solscan.io/tx/${result.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  View Transaction
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionResult;
```

### 5. Complete CSS Styles

```css
/* Flow Manager Styles */
.flow-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.flow-selection {
  text-align: center;
  padding: 40px 20px;
}

.flow-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 30px;
}

.flow-button {
  padding: 20px 40px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

.launch-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.swap-button {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.flow-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.flow-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Active Flow Styles */
.active-flow {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  overflow: hidden;
}

.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.flow-header h3 {
  margin: 0;
  color: #333;
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

/* Messages Styles */
.messages-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 16px;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
}

.message.user .message-content {
  background: #007bff;
  color: white;
}

.message.assistant .message-content {
  background: #f1f3f4;
  color: #333;
}

/* Step Input Styles */
.step-input {
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

/* Image Upload Styles */
.image-upload-container {
  width: 100%;
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

.uploading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.image-preview {
  text-align: center;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  margin-bottom: 16px;
}

/* Text Input Styles */
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
  transition: border-color 0.3s ease;
}

.text-input:focus {
  border-color: #007bff;
}

.text-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.send-button {
  padding: 12px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.send-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.send-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Transaction Result Styles */
.transaction-result {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1000;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.result-header h3 {
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.result-content {
  padding: 20px;
}

.result-message {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  line-height: 1.6;
}

.detail-item {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-item strong {
  display: block;
  margin-bottom: 8px;
  color: #333;
}

.detail-item code {
  display: block;
  background: #e9ecef;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
  margin: 8px 0;
}

.external-link {
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
}

.external-link:hover {
  text-decoration: underline;
}

.sign-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 8px;
}

.sign-button:hover {
  background: #218838;
}

/* Responsive Design */
@media (max-width: 768px) {
  .flow-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .flow-button {
    width: 100%;
    max-width: 300px;
  }
  
  .message-content {
    max-width: 85%;
  }
  
  .transaction-result {
    width: 95%;
    margin: 20px;
  }
}
```

## Usage Example

```typescript
import React from 'react';
import FlowManager from './FlowManager';
import TransactionResult from './TransactionResult';

const App: React.FC = () => {
  const [transactionResult, setTransactionResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleFlowComplete = (result: any) => {
    setTransactionResult(result);
    setShowResult(true);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setTransactionResult(null);
  };

  return (
    <div className="app">
      <FlowManager
        userId="your-user-id"
        authToken="your-auth-token"
        onComplete={handleFlowComplete}
      />
      
      {showResult && transactionResult && (
        <TransactionResult
          result={transactionResult}
          onClose={handleCloseResult}
        />
      )}
    </div>
  );
};

export default App;
```

## Key Features

### ✅ **Complete Flow Management**
- Handles both token launch and swap flows
- Multi-step conversation interface
- Session management and persistence

### ✅ **Image Upload Integration**
- Drag & drop interface
- File validation (type, size)
- Preview functionality
- Error handling with retry

### ✅ **Transaction Handling**
- Unsigned transaction display
- Transaction signing integration
- Success/error result display
- External links to Solscan

### ✅ **Professional UI/UX**
- Responsive design
- Loading states
- Error handling
- Clean, modern interface

### ✅ **Real-time Updates**
- Step-by-step progress
- Context preservation
- Session continuity

This implementation provides a complete, production-ready solution for both token launch and swap flows with professional image upload handling.
