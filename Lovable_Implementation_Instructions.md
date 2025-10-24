# Lovable Implementation Instructions

## Overview
This document provides instructions for implementing chat history functionality and fixing the RAG fallback system in the Yappysol frontend.

## 1. Chat History Implementation

### Required State Management

Add these interfaces and state to your chat context/state management:

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

### API Service Functions

Create these API functions in your service layer:

```typescript
// Load all chat sessions
const loadSessions = async () => {
  const response = await fetch('/api/chat/sessions', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to load sessions');
  return response.json();
};

// Create new session
const createNewSession = async (customTitle?: string) => {
  const response = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: customTitle })
  });
  
  if (!response.ok) throw new Error('Failed to create session');
  return response.json();
};

// Load specific session
const loadSession = async (sessionId: string) => {
  const response = await fetch(`/api/chat/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to load session');
  return response.json();
};

// Delete session
const deleteSession = async (sessionId: string) => {
  const response = await fetch(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to delete session');
  return response.json();
};
```

### Updated Send Message Function

Modify your existing send message function to include session tracking:

```typescript
const sendMessage = async (message: string, context: any = {}) => {
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
  
  // Prepare request context with sessionId
  const requestContext = {
    sessionId: currentSessionId, // Include current session ID
    walletAddress: walletAddress,
    ...context // Include any existing context (currentStep, currentAction, etc.)
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
};
```

### UI Components

#### 1. Chat History Sidebar

Create a sidebar component to display chat history:

```typescript
const ChatHistorySidebar = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadSessions().then(data => setSessions(data.sessions));
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

#### 2. Update Main Chat Interface

Modify your existing chat interface to:

1. **Load sessions on app start**
2. **Show current session messages**
3. **Handle new chat creation**
4. **Preserve multi-step flow context**

```typescript
const ChatInterface = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Load sessions on component mount
  useEffect(() => {
    loadSessions().then(data => {
      setSessions(data.sessions);
      // If no current session, create a new one
      if (!currentSessionId && data.sessions.length === 0) {
        createNewSession().then(data => {
          setCurrentSessionId(data.session.id);
          setCurrentSession(data.session);
        });
      }
    });
  }, []);
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;
    
    setIsSending(true);
    try {
      // Include current step context if in multi-step flow
      const context = {
        currentStep: currentStep, // From your existing state
        currentAction: currentAction // From your existing state
      };
      
      await sendMessage(messageInput.trim(), context);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="chat-interface">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar />
      
      {/* Messages Container */}
      <div className="messages-container">
        {currentSession?.messages.map(message => (
          <MessageBubble 
            key={message.id}
            message={message}
          />
        ))}
      </div>
      
      {/* Message Input */}
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

## 2. Multi-Step Flow Context Preservation

### Update Context Handling

Ensure your existing multi-step flow state is preserved across sessions:

```typescript
// In your existing multi-step flow logic, make sure to:
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

### Include Context in Requests

Make sure every message request includes the current step context:

```typescript
const requestContext = {
  sessionId: currentSessionId,
  walletAddress: walletAddress,
  currentStep: currentStep, // Include this
  currentAction: currentAction, // Include this
  // ... any other existing context
};
```

## 3. RAG Fallback Fix

The backend has been updated to properly handle RAG fallback. No frontend changes are needed for this fix, but you should test that:

1. **General questions** (like "is it a good idea to buy solana now") now get proper AI responses instead of generic fallback messages
2. **Knowledge base questions** still work as before
3. **Investment/trading questions** get thoughtful responses with risk disclaimers

## 4. CSS Styling Requirements

Add these styles for the chat history sidebar:

```css
.chat-history-sidebar {
  width: 250px;
  height: 100vh;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #ddd;
}

.sidebar-header button {
  width: 100%;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  background: white;
  border: 1px solid #eee;
}

.session-item:hover {
  background: #f0f0f0;
}

.session-item.active {
  background: #e3f2fd;
  border-color: #2196f3;
}

.session-title {
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 14px;
}

.session-date {
  font-size: 12px;
  color: #666;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  color: #f44336;
}
```

## 5. Implementation Checklist

- [ ] Add chat state management interfaces
- [ ] Create API service functions for session management
- [ ] Update send message function to include sessionId
- [ ] Create ChatHistorySidebar component
- [ ] Update main ChatInterface to load and manage sessions
- [ ] Ensure multi-step flow context is preserved
- [ ] Add CSS styling for chat history sidebar
- [ ] Test new chat creation
- [ ] Test loading existing chats
- [ ] Test session deletion
- [ ] Test multi-step flows with session persistence
- [ ] Test RAG fallback with various question types

## 6. Testing Scenarios

1. **New User**: Should automatically create first session
2. **Existing User**: Should load all previous sessions
3. **Multi-Step Flow**: Should preserve step state across messages
4. **Session Switching**: Should load different sessions correctly
5. **Session Deletion**: Should remove sessions and handle current session
6. **RAG Questions**: Should get proper AI responses for general questions
7. **Error Handling**: Should handle network errors gracefully

## 7. Notes

- The backend automatically creates new sessions if none exist when sending messages
- Session titles are auto-generated from the first user message
- All API calls require authentication via JWT token
- Multi-step flows (token creation, swaps) preserve state through context
- The RAG system now properly falls back to OpenAI for general questions
- Messages are stored with timestamps and can include attachments and actions

## 8. Priority Order

1. **High Priority**: Chat history sidebar and session management
2. **High Priority**: Update send message function with session tracking
3. **Medium Priority**: Multi-step flow context preservation
4. **Low Priority**: Advanced features like local storage caching
5. **Testing**: Verify RAG fallback works correctly

This implementation will provide users with persistent chat history while maintaining all existing functionality including multi-step flows and proper AI responses.
