# Chat History Frontend Implementation Guide

## Overview

This guide explains how to implement chat history functionality in the frontend, including creating new chats, loading existing chats, and managing chat sessions.

## Backend API Endpoints

### 1. Get All Chat Sessions
```
GET /api/chat/sessions
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "user_id": "user_id",
      "title": "Auto-generated title",
      "custom_title": "User custom title (optional)",
      "messages": [
        {
          "id": "msg_id",
          "content": "Message content",
          "role": "user" | "assistant",
          "attachments": [],
          "action": "action_type",
          "created_at": "2024-01-01T00:00:00.000Z"
        }
      ],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Create New Chat Session
```
POST /api/chat/sessions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Optional custom title"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "user_id",
    "title": "New Chat",
    "custom_title": null,
    "messages": [],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Get Specific Chat Session
```
GET /api/chat/sessions/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "user_id": "user_id",
    "title": "Chat title",
    "custom_title": null,
    "messages": [...],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Chat Session
```
PUT /api/chat/sessions/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "messages": [...],
  "customTitle": "Optional custom title"
}
```

### 5. Delete Chat Session
```
DELETE /api/chat/sessions/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true
}
```

### 6. Send Chat Message (with session tracking)
```
POST /api/chat/message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "User message",
  "context": {
    "sessionId": "uuid", // Optional - if not provided, creates new session
    "walletAddress": "wallet_address",
    "currentStep": "step_name", // For multi-step flows
    "currentAction": "action_type" // For multi-step flows
  }
}
```

## Frontend Implementation Strategy

### 1. State Management

```typescript
interface ChatState {
  // Current active session
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  
  // All user sessions
  sessions: ChatSession[];
  
  // UI state
  isLoading: boolean;
  isCreatingSession: boolean;
  error: string | null;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  customTitle?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  attachments?: any[];
  action?: string;
  createdAt: string;
}
```

### 2. Key Functions

#### Load All Sessions
```typescript
const loadSessions = async () => {
  try {
    setIsLoading(true);
    const response = await fetch('/api/chat/sessions', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to load sessions');
    
    const data = await response.json();
    setSessions(data.sessions);
  } catch (error) {
    setError('Failed to load chat history');
    console.error('Error loading sessions:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### Create New Session
```typescript
const createNewSession = async (customTitle?: string) => {
  try {
    setIsCreatingSession(true);
    const response = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: customTitle })
    });
    
    if (!response.ok) throw new Error('Failed to create session');
    
    const data = await response.json();
    const newSession = data.session;
    
    // Add to sessions list
    setSessions(prev => [newSession, ...prev]);
    
    // Set as current session
    setCurrentSessionId(newSession.id);
    setCurrentSession(newSession);
    
    return newSession;
  } catch (error) {
    setError('Failed to create new chat');
    console.error('Error creating session:', error);
    return null;
  } finally {
    setIsCreatingSession(false);
  }
};
```

#### Load Specific Session
```typescript
const loadSession = async (sessionId: string) => {
  try {
    setIsLoading(true);
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to load session');
    
    const data = await response.json();
    const session = data.session;
    
    if (session) {
      setCurrentSessionId(sessionId);
      setCurrentSession(session);
    } else {
      throw new Error('Session not found');
    }
  } catch (error) {
    setError('Failed to load chat');
    console.error('Error loading session:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### Send Message
```typescript
const sendMessage = async (message: string, context: any = {}) => {
  try {
    // Add user message to current session immediately (optimistic update)
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      content: message,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage]
      };
      setCurrentSession(updatedSession);
    }
    
    // Prepare request context
    const requestContext = {
      sessionId: currentSessionId,
      walletAddress: walletAddress,
      ...context
    };
    
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        context: requestContext
      })
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    
    const data = await response.json();
    
    // Handle response
    if (data.sessionId && data.sessionId !== currentSessionId) {
      // New session was created
      setCurrentSessionId(data.sessionId);
      // Load the new session
      await loadSession(data.sessionId);
    } else if (currentSession) {
      // Add assistant response to current session
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        content: data.prompt,
        role: 'assistant',
        action: data.action,
        createdAt: new Date().toISOString()
      };
      
      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, assistantMessage]
      };
      setCurrentSession(updatedSession);
      
      // Update sessions list
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? updatedSession : s
      ));
    }
    
    return data;
  } catch (error) {
    setError('Failed to send message');
    console.error('Error sending message:', error);
    throw error;
  }
};
```

#### Delete Session
```typescript
const deleteSession = async (sessionId: string) => {
  try {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to delete session');
    
    // Remove from sessions list
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    // If this was the current session, clear it
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setCurrentSession(null);
    }
    
    return true;
  } catch (error) {
    setError('Failed to delete chat');
    console.error('Error deleting session:', error);
    return false;
  }
};
```

### 3. UI Components

#### Chat History Sidebar
```typescript
const ChatHistorySidebar = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadSessions();
  }, []);
  
  return (
    <div className="chat-history-sidebar">
      <div className="sidebar-header">
        <button onClick={() => createNewSession()}>
          + New Chat
        </button>
      </div>
      
      <div className="sessions-list">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id}
              className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
              onClick={() => loadSession(session.id)}
            >
              <div className="session-title">
                {session.customTitle || session.title}
              </div>
              <div className="session-date">
                {formatDate(session.updatedAt)}
              </div>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

#### Chat Interface
```typescript
const ChatInterface = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
    } catch (error) {
      // Handle error
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="chat-interface">
      <div className="messages-container">
        {currentSession?.messages.map(message => (
          <MessageBubble 
            key={message.id}
            message={message}
          />
        ))}
      </div>
      
      <div className="message-input">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
          disabled={isSending}
        />
        <button 
          onClick={handleSendMessage}
          disabled={isSending || !messageInput.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};
```

### 4. Multi-Step Flow Handling

For multi-step flows (token creation, swaps), the frontend should:

1. **Preserve Step State**: Store `currentStep` and `currentAction` in the context
2. **Handle Step Responses**: Check for `step` field in responses to continue flows
3. **Update Context**: Include step information in subsequent requests

```typescript
const handleStepFlow = (response: any) => {
  if (response.step) {
    // Update context with current step
    setContext(prev => ({
      ...prev,
      currentStep: response.step,
      currentAction: response.action
    }));
  } else if (response.step === null) {
    // Flow completed, clear step context
    setContext(prev => ({
      ...prev,
      currentStep: null,
      currentAction: null
    }));
  }
};
```

### 5. Error Handling

```typescript
const handleChatError = (error: any) => {
  if (error.message?.includes('session not found')) {
    // Session was deleted or doesn't exist, create new one
    createNewSession();
  } else if (error.message?.includes('authentication')) {
    // Redirect to login
    redirectToLogin();
  } else {
    // Show generic error
    setError('Something went wrong. Please try again.');
  }
};
```

### 6. Performance Optimizations

1. **Lazy Loading**: Load session messages only when needed
2. **Pagination**: Implement pagination for large message histories
3. **Caching**: Cache sessions in localStorage for offline access
4. **Debouncing**: Debounce message sending to prevent spam

### 7. Local Storage Integration

```typescript
// Save current session to localStorage
const saveSessionToStorage = (session: ChatSession) => {
  localStorage.setItem('currentChatSession', JSON.stringify(session));
};

// Load session from localStorage on app start
const loadSessionFromStorage = () => {
  const saved = localStorage.getItem('currentChatSession');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Failed to parse saved session:', error);
    }
  }
  return null;
};
```

## Implementation Checklist

- [ ] Implement session state management
- [ ] Create API service functions for all endpoints
- [ ] Build chat history sidebar component
- [ ] Implement message sending with session tracking
- [ ] Add session creation and deletion functionality
- [ ] Handle multi-step flow state preservation
- [ ] Implement error handling and recovery
- [ ] Add loading states and optimistic updates
- [ ] Test with various scenarios (new chat, existing chat, session deletion)
- [ ] Add local storage integration for offline support

## Notes

- The backend automatically creates new sessions if none exist when sending messages
- Session titles are auto-generated from the first user message
- Messages are stored with timestamps and can include attachments and actions
- Multi-step flows preserve state through the `currentStep` and `currentAction` context fields
- All endpoints require authentication via JWT token

