# Session Management for n8n Integration

## 🎯 Overview

Sessions in Yappysol are managed through **Supabase database** and provide **conversation continuity** and **message history**. Here's how to properly handle them in the n8n integration.

## 📊 Current Session Architecture

### **Database Structure (Supabase)**
```sql
-- chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  custom_title TEXT,
  messages JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **Session Model**
```typescript
interface ChatSession {
  id: string;           // UUID
  user_id: string;      // User ID
  title: string;        // Auto-generated or custom title
  custom_title?: string; // User-defined title
  messages: ChatMessage[]; // Array of messages
  created_at: string;    // ISO timestamp
  updated_at: string;    // ISO timestamp
}

interface ChatMessage {
  id: string;           // Message ID
  content: string;      // Message text
  role: string;         // 'user' or 'assistant'
  attachments?: any[];  // File attachments
  action?: string;      // Action type (optional)
  created_at: string;   // ISO timestamp
}
```

## 🔄 Session Flow in n8n Integration

### **1. Session Creation**
```typescript
// Frontend creates session
const session = await fetch('/api/chat/sessions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ title: 'New Chat' })
});

const { session: { id: sessionId } } = await session.json();
```

### **2. Session Usage in n8n Webhook**
```typescript
// Frontend sends to n8n webhook
const response = await fetch('/api/n8n/n8n-webhook', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    session_id: sessionId,        // Required: Session UUID
    user_id: userId,              // Required: User UUID
    text: userMessage,            // Required: User message
    walletRef: walletAddress      // Required: Wallet address
  })
});
```

### **3. Session Management in Backend**
```typescript
// Backend handles session in n8n webhook
router.post('/n8n-webhook', asyncHandler(async (req, res) => {
  const { session_id, user_id, text, walletRef } = req.body;
  
  // Forward to n8n with session context
  const n8nResponse = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BACKEND_SERVER_KEY}` },
    body: JSON.stringify({
      session_id,    // Pass through to n8n
      user_id,       // Pass through to n8n
      text,          // User message
      walletRef      // Wallet context
    })
  });
  
  const data = await n8nResponse.json();
  
  // Save assistant message to session
  if (session_id) {
    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      content: data.message,
      role: 'assistant',
      action: data.action,
      created_at: new Date().toISOString()
    };
    await ChatSessionModel.addMessage(session_id, assistantMessage);
  }
  
  res.json({
    message: data.message,
    session_id: session_id,
    route: data.route || 'chat'
  });
}));
```

## 🛠️ Implementation Guide

### **Frontend Session Management**

#### **1. Create New Session**
```typescript
const createNewSession = async () => {
  const response = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'New Chat'
    })
  });
  
  const { session } = await response.json();
  return session.id;
};
```

#### **2. Load Existing Sessions**
```typescript
const loadSessions = async () => {
  const response = await fetch('/api/chat/sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { sessions } = await response.json();
  return sessions;
};
```

#### **3. Load Session Messages**
```typescript
const loadSessionMessages = async (sessionId: string) => {
  const response = await fetch(`/api/chat/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { session } = await response.json();
  return session.messages;
};
```

#### **4. Send Message with Session**
```typescript
const sendMessage = async (message: string, sessionId: string) => {
  const response = await fetch('/api/n8n/n8n-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      text: message,
      walletRef: walletAddress
    })
  });
  
  const data = await response.json();
  
  // Update UI with response
  setMessages(prev => [...prev, {
    id: Date.now(),
    content: data.message,
    role: 'assistant',
    timestamp: new Date()
  }]);
};
```

### **Backend Session Handling**

#### **1. Session Validation**
```typescript
// Validate session exists and belongs to user
const validateSession = async (sessionId: string, userId: string) => {
  const session = await ChatSessionModel.findById(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.user_id !== userId) {
    throw new Error('Session does not belong to user');
  }
  
  return session;
};
```

#### **2. Message Persistence**
```typescript
// Save user message
const saveUserMessage = async (sessionId: string, message: string) => {
  const userMessage = {
    id: `msg-${Date.now()}-user`,
    content: message,
    role: 'user',
    created_at: new Date().toISOString()
  };
  
  await ChatSessionModel.addMessage(sessionId, userMessage);
};

// Save assistant message
const saveAssistantMessage = async (sessionId: string, response: any) => {
  const assistantMessage = {
    id: `msg-${Date.now()}-assistant`,
    content: response.message,
    role: 'assistant',
    action: response.action,
    created_at: new Date().toISOString()
  };
  
  await ChatSessionModel.addMessage(sessionId, assistantMessage);
};
```

## 🔧 n8n Workflow Session Handling

### **1. Session Context in n8n**
```json
{
  "session_id": "uuid-session-id",
  "user_id": "uuid-user-id", 
  "text": "user message",
  "walletRef": "wallet-address"
}
```

### **2. Session Persistence in n8n**
- **n8n receives** session_id from backend
- **n8n processes** the message with session context
- **n8n returns** response with same session_id
- **Backend saves** both user and assistant messages to session

### **3. Session State Management**
```typescript
// In n8n workflow, maintain session state
const sessionState = {
  currentStep: null,        // For multi-step flows
  context: {},             // Session-specific context
  history: []              // Message history
};

// Update session state based on message
const updateSessionState = (sessionId: string, message: string, response: any) => {
  // Update session state logic
  // This can be stored in n8n's memory or external storage
};
```

## 📋 Session Management Checklist

### **Frontend Requirements:**
- ✅ Create new session when starting new chat
- ✅ Load existing sessions on app startup
- ✅ Pass session_id in every n8n webhook request
- ✅ Handle session_id in responses
- ✅ Update UI with session messages
- ✅ Allow session switching

### **Backend Requirements:**
- ✅ Validate session ownership
- ✅ Save user messages to session
- ✅ Save assistant responses to session
- ✅ Pass session_id to n8n
- ✅ Handle session errors gracefully

### **n8n Requirements:**
- ✅ Receive session_id from backend
- ✅ Maintain session context
- ✅ Return session_id in responses
- ✅ Handle multi-step flows with session state

## 🚨 Common Session Issues

### **1. Missing Session ID**
```typescript
// Problem: Frontend not sending session_id
// Solution: Always create session before sending messages
if (!sessionId) {
  sessionId = await createNewSession();
}
```

### **2. Invalid Session ID**
```typescript
// Problem: Session doesn't exist or belongs to different user
// Solution: Validate session before processing
const session = await validateSession(sessionId, userId);
if (!session) {
  // Create new session or return error
}
```

### **3. Session Not Persisting**
```typescript
// Problem: Messages not saved to session
// Solution: Ensure both user and assistant messages are saved
await saveUserMessage(sessionId, userMessage);
// ... process message ...
await saveAssistantMessage(sessionId, response);
```

## 🎯 Best Practices

### **1. Session Lifecycle**
- **Create** session when user starts new chat
- **Load** existing sessions on app startup
- **Update** session with each message exchange
- **Delete** sessions when user explicitly deletes them

### **2. Error Handling**
- **Graceful fallback** if session creation fails
- **Retry logic** for session operations
- **Clear error messages** for session issues

### **3. Performance**
- **Lazy load** session messages
- **Paginate** long conversation histories
- **Cache** frequently accessed sessions

## 📝 Updated Lovable Instructions

Add this to your Lovable update instructions:

```typescript
// Session Management Implementation
const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

// Create session on new chat
const startNewChat = async () => {
  const response = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'New Chat' })
  });
  
  const { session } = await response.json();
  setCurrentSessionId(session.id);
  setMessages([]);
};

// Send message with session
const sendMessage = async (message: string) => {
  if (!currentSessionId) {
    await startNewChat();
  }
  
  const response = await fetch('/api/n8n/n8n-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      session_id: currentSessionId,
      user_id: userId,
      text: message,
      walletRef: walletAddress
    })
  });
  
  const data = await response.json();
  // Handle response...
};
```

This ensures proper session management throughout the n8n integration! 🚀
