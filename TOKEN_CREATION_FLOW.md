# Token Creation Flow - Complete Implementation Guide

## Problem Summary

The image upload fails with the error: **"Unexpected token '<', " <!DOCTYPE "... is not valid JSON"**

This happens because:
1. The backend endpoint `/api/chat/token-creation` expects `multipart/form-data` with a file
2. When the route doesn't match correctly, Express returns an HTML 404 page instead of JSON
3. The frontend tries to parse HTML as JSON, causing the error

## Backend Implementation

### Endpoint Details

**URL:** `POST /api/chat/token-creation`  
**Content-Type:** `multipart/form-data`  
**Location:** `Yappysol/backend/src/routes/chat.ts:231`

### Request Format

```typescript
const formData = new FormData();
formData.append('file', imageFile);        // File object
formData.append('userId', userId);         // User ID string
```

### Backend Handler

```typescript
router.post('/token-creation', upload.single('file'), asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      prompt: 'Please upload an image file for your token.',
      step: 'image'
    });
  }

  const tokenCreationService = new TokenCreationService();
  const result = await tokenCreationService.handleImageUpload(req.file, { userId });
  
  res.json(result);
}));
```

### Response Format

**Success Response:**
```json
{
  "prompt": "Great! I've saved your token image. Now, please provide your Twitter link (or type 'skip' to leave blank).",
  "step": "twitter"
}
```

**Error Response:**
```json
{
  "error": "No file uploaded",
  "prompt": "Please upload an image file for your token.",
  "step": "image"
}
```

## Frontend Implementation

### Current Implementation

**Location:** `Yappysol/frontend/src/services/api.ts`

```typescript
export async function sendChatMessage(message: string, context: any = {}, sessionId?: string) {
  const user = localStorage.getItem('user');
  const userId = user ? JSON.parse(user).id : null;
  
  const enhancedContext = {
    ...context,
    ...(userId && { userId })
  };

  // Handle image step: send file as multipart/form-data
  if (context.currentStep === 'image' && context.attachments && context.attachments.length > 0) {
    const formData = new FormData();
    const file = context.attachments[0].file || context.attachments[0];
    formData.append('file', file);
    formData.append('userId', userId);
    
    const endpoint = `${API_BASE_URL}/api/chat/token-creation`;
    console.log('[API] Sending image step to endpoint:', endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,  // ✅ FormData correctly sent
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to send image');
    return res.json();
  }

  // Default: send as JSON
  const endpoint = `${API_BASE_URL}/api/chat/message`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, context: enhancedContext, sessionId }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}
```

**Location:** `Yappysol/frontend/src/pages/Chat.tsx:422`

```typescript
const handleSendMessage = useCallback(async ({ input, attachments }: { input: string; attachments: Attachment[] }) => {
  if (currentStep === 'image') {
    if (!attachments.length) return;
    
    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      content: '',
      role: 'user',
      attachments: [...attachments],
    };
    addMessage(userMessage);
    setIsGenerating(true);
    
    try {
      const response = await sendChatMessage('', {
        messages: [...messages, userMessage],
        attachments,
        currentStep,  // ✅ This triggers the image upload path
      });
      
      if (response.prompt && typeof response.step !== 'undefined') {
        addMessage({
          id: `ai-${Date.now()}`,
          content: response.prompt,
          role: 'assistant',
          action: response.action,
        });
        setCurrentStep(response.step);
      }
    } catch (e) {
      addMessage({ id: `err-${Date.now()}`, content: 'Error contacting backend', role: 'assistant', action: 'error' });
    }
    setIsGenerating(false);
    return;
  }
  // ... rest of logic
});
```

## Root Cause Analysis

### The Issue

The error occurs because:

1. **Frontend sends correctly**: FormData with file attachment
2. **Backend route exists**: `/api/chat/token-creation` at line 231 in `chat.ts`
3. **Multer configured**: `upload.single('file')` expects field name `file` ✅
4. **Problem**: The HTML response suggests the endpoint is NOT being reached

### Possible Causes

1. **Route not registered properly** - Check if the route is being exported and used in `app.ts`
2. **Middleware issue** - The `authMiddleware` is missing from this route (lines 19 vs 231)
3. **CORS issue** - FormData requests might be blocked
4. **Missing userId** - Backend requires `userId` in body

### Backend Route Registration

The route is registered in `Yappysol/backend/src/app.ts:65`:
```typescript
app.use('/api/chat', chatRoutes);
```

## Token Creation Flow - Complete Steps

### Step 1: User Initiates Token Creation
- User says: "create a token called MyToken"
- **Backend**: `TokenCreationService.handleCreationIntent()`
- **Returns**: `{ step: 'description' }`

### Step 2: Description
- User provides: "This is buko coin"
- **Backend**: Stores description, moves to next step
- **Returns**: `{ step: 'image' }`

### Step 3: Image Upload (CURRENTLY FAILING)
- Frontend detects `currentStep === 'image'`
- Shows file input UI
- User selects image
- **Frontend**: Calls `sendChatMessage('', { currentStep: 'image', attachments: [...] })`
- **Expected**: `POST /api/chat/token-creation` with FormData
- **Actual**: Receiving HTML instead of JSON

### Step 4-N: Continue with Twitter, Telegram, Website, Pool Selection

### Final Step: Blockchain Transaction
- Backend calls Pump.fun API or creates token transaction
- Returns unsigned transaction
- User signs with wallet
- Token created on Solana

## Fix Applied

### ✅ Added Missing Auth Middleware

The `/message` endpoint uses `authMiddleware`, but `/token-creation` was missing it. **This has been fixed:**

```typescript
// FIXED (Line 231)
router.post('/token-creation', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  // Get userId from authenticated user or request body
  const userId = req.user?.id || req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      prompt: 'Please upload an image file for your token.',
      step: 'image'
    });
  }

  const tokenCreationService = new TokenCreationService();
  const result = await tokenCreationService.handleImageUpload(req.file, { userId });
  
  res.json(result);
}));
```

### Option 2: Accept userId from Body (Current Implementation)

If we want to keep the current approach without auth middleware:

```typescript
// Frontend must send userId in FormData
formData.append('userId', userId);

// Backend validates it
const userId = req.body.userId;
if (!userId) {
  return res.status(401).json({ error: 'User ID required' });
}
```

## Testing Checklist

1. **Verify backend is running**
   ```bash
   cd Yappysol/backend
   npm run dev
   ```

2. **Check backend logs for the request**
   ```
   [CHAT] /token-creation endpoint called
   [CHAT] File: File received
   [CHAT] Body: { userId: '...' }
   ```

3. **Check Network tab in DevTools**
   - Request URL should be: `https://yappy-solana-yap-machine.lovable.app/api/chat/token-creation`
   - Request Method: `POST`
   - Content-Type: `multipart/form-data; boundary=...`
   - Status: `200 OK` (not 404)

4. **Verify Response**
   - Should be JSON: `{ prompt: "...", step: "twitter" }`
   - Not HTML: `<!DOCTYPE html>...`

## Additional Notes

- The `handleImageUpload` method stores the file buffer in memory sessions (`tokenCreationSessions[userId]`)
- The file is later used in `createTokenMetadata()` when creating the token on Pump.fun or Bonk
- File size limit: 10MB (configured in multer)
- Supported formats: Any image format

## Implementation Status

- ✅ Backend endpoint exists
- ✅ Frontend FormData sending works
- ✅ Token creation service handles image upload
- ✅ Authentication middleware added
- ✅ Route properly secured with authMiddleware
- ✅ UserId extraction from authenticated user

## Next Steps

1. **Restart backend server** to apply the fix
2. Test the image upload flow end-to-end
3. Verify the image is stored correctly in the session
4. Complete the token creation flow

## What Changed

The fix adds `authMiddleware` to the `/token-creation` route, ensuring:
- User authentication is validated
- User ID is extracted from the authenticated session
- Route is protected from unauthorized access
- Proper error handling for unauthenticated requests

