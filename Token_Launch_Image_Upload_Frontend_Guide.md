# Token Launch Image Upload - Frontend Implementation Guide

## Overview
This guide explains how the frontend should handle image uploads during the token creation multi-step flow.

## Backend API Endpoints

### 1. Image Upload Endpoint
**URL**: `POST /api/chat/token-creation`
**Purpose**: Handles image file uploads during token creation

**Request Format**:
```typescript
// FormData with file upload
const formData = new FormData();
formData.append('file', imageFile); // File object
formData.append('userId', userId);  // User ID string
```

**Response Format**:
```typescript
{
  prompt: string;    // Next step message
  step: string;      // Next step in flow ('twitter')
  action?: string;   // Optional action type
}
```

### 2. Regular Chat Endpoint
**URL**: `POST /api/chat/message`
**Purpose**: Handles text messages and continues the flow

## Frontend Implementation

### 1. Image Upload Component

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
        // Don't set Content-Type header, let browser set it with boundary
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
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
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
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

### 2. Token Creation Flow Component

```typescript
import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';

interface TokenCreationFlowProps {
  userId: string;
  onComplete: (result: any) => void;
}

const TokenCreationFlow: React.FC<TokenCreationFlowProps> = ({ 
  userId, 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Start token creation flow
  const startTokenCreation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` // Your auth token
        },
        body: JSON.stringify({
          message: 'create token',
          context: {
            userId,
            currentStep: null
          }
        })
      });

      const result = await response.json();
      setCurrentStep(result.step);
      setMessages(prev => [...prev, 
        { role: 'assistant', content: result.prompt }
      ]);
    } catch (error) {
      console.error('Error starting token creation:', error);
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
      { role: 'assistant', content: `Error: ${error}. Please try again.` }
    ]);
  };

  // Handle text input for other steps
  const handleTextInput = async (message: string) => {
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
            previousMessages: messages
          }
        })
      });

      const result = await response.json();
      
      if (result.step === null) {
        // Flow completed
        onComplete(result);
      } else {
        setCurrentStep(result.step);
        setMessages(prev => [...prev, 
          { role: 'user', content: message },
          { role: 'assistant', content: result.prompt }
        ]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="token-creation-flow">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="input-container">
        {currentStep === 'image' ? (
          <ImageUpload
            userId={userId}
            onUploadSuccess={handleImageUploadSuccess}
            onUploadError={handleImageUploadError}
          />
        ) : currentStep ? (
          <div className="text-input-container">
            <input
              type="text"
              placeholder="Type your response..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTextInput(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              disabled={isLoading}
            />
            <button 
              onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (input.value) {
                  handleTextInput(input.value);
                  input.value = '';
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </div>
        ) : (
          <button onClick={startTokenCreation} disabled={isLoading}>
            {isLoading ? 'Starting...' : 'Create Token'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TokenCreationFlow;
```

### 3. CSS Styles

```css
.image-upload-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
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

.text-input-container {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.text-input-container input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.text-input-container button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.text-input-container button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
```

## Flow Sequence

### 1. **Start Flow**
- User clicks "Create Token"
- Frontend calls `/api/chat/message` with `message: 'create token'`
- Backend responds with `step: 'name'` and prompt for token name

### 2. **Text Steps** (name, symbol, description, twitter, telegram, website, pool, amount, confirmation)
- User types response
- Frontend calls `/api/chat/message` with user input and current step context
- Backend processes and returns next step or completion

### 3. **Image Step** (special handling)
- Backend sets `step: 'image'`
- Frontend shows `ImageUpload` component
- User uploads image file
- Frontend calls `/api/chat/token-creation` with FormData
- Backend processes image and returns `step: 'twitter'`

### 4. **Completion**
- When `step: null`, flow is complete
- Backend returns final result with transaction details

## Error Handling

### Image Upload Errors
```typescript
// File validation errors
if (!file.type.startsWith('image/')) {
  // Show error: "Please upload an image file"
}

if (file.size > 10 * 1024 * 1024) {
  // Show error: "File size must be less than 10MB"
}

// Network errors
catch (error) {
  // Show error: "Upload failed. Please try again."
}
```

### Flow Errors
```typescript
// Step processing errors
if (result.error) {
  // Show error message to user
  // Keep current step active for retry
}
```

## Key Points

1. **Two Different Endpoints**: Use `/api/chat/message` for text, `/api/chat/token-creation` for images
2. **FormData for Images**: Don't set Content-Type header, let browser handle multipart/form-data
3. **Step Context**: Always include `currentStep` in context for proper flow continuation
4. **File Validation**: Validate file type and size on frontend before upload
5. **Error Recovery**: Handle errors gracefully and allow users to retry
6. **Loading States**: Show appropriate loading indicators during uploads and processing

This implementation ensures smooth image uploads during the token creation flow while maintaining the multi-step conversation experience.

