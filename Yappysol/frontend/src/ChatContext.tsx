import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { API_BASE_URL } from "./services/api";

// Types
export interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

export interface UIMessage {
  id: string;
  content: string;
  role: string;
  attachments?: Attachment[];
  action?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  customTitle?: string;
  messages: UIMessage[];
  createdAt: number;
}

interface ChatContextType {
  chatSessions: ChatSession[];
  currentChatId: string;
  currentMessages: UIMessage[];
  loading: boolean;
  startNewChat: () => void;
  switchChat: (id: string) => void;
  addMessage: (msg: UIMessage) => void;
  resetCurrentChat: () => void;
  renameChat: (id: string, newName: string) => void;
  deleteChat: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
};

function generateTitle(messages: UIMessage[]): string {
  if (messages.length === 0) return "New Chat";
  
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return "New Chat";
  
  const content = firstUserMessage.content;
  if (content.length <= 30) return content;
  return content.substring(0, 30) + "...";
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const { token, isAuthenticated } = useAuth();

  // Load chat sessions from backend
  const loadChatSessions = useCallback(async () => {
    if (!token || !isAuthenticated || isLoadingSessions) {
      setChatSessions([]);
      setCurrentChatId("");
      setLoading(false);
      return;
    }

    try {
      setIsLoadingSessions(true);
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.sessions || []);
        
        // Set current chat to the most recent one if none is selected
        if (data.sessions && data.sessions.length > 0 && !currentChatId) {
          setCurrentChatId(data.sessions[0].id);
        }
      } else {
        console.error('Failed to load chat sessions:', response.statusText);
        setChatSessions([]);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setChatSessions([]);
    } finally {
      setLoading(false);
      setIsLoadingSessions(false);
    }
  }, [token, isAuthenticated, isLoadingSessions, currentChatId]);

  // Load sessions when user authenticates
  useEffect(() => {
    if (token && isAuthenticated) {
      loadChatSessions();
    }
  }, [token, isAuthenticated]); // Remove loadChatSessions from dependencies to prevent infinite loop

  // Get current chat messages
  const currentSession = chatSessions.find((c) => c.id === currentChatId);
  const currentMessages = currentSession ? currentSession.messages : [];

  // Start a new chat
  const startNewChat = useCallback(async () => {
    if (!token || !isAuthenticated) {
      console.error('Cannot create new chat: user not authenticated');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Chat'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newSession = data.session;
        
        setChatSessions((prev) => {
          const updated = [newSession, ...prev].slice(0, 5);
          console.log('[ChatContext] startNewChat: created new session', newSession, 'updated sessions:', updated);
          return updated;
        });
        setCurrentChatId(newSession.id);
        console.log('[ChatContext] startNewChat: setCurrentChatId', newSession.id);
      } else {
        console.error('Failed to create new chat session:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating new chat session:', error);
    }
  }, [token, isAuthenticated]);

  // Switch to a chat
  const switchChat = useCallback((id: string) => {
    setCurrentChatId(id);
    console.log('[ChatContext] switchChat: setCurrentChatId', id);
  }, []);

  // Add a message to the current chat
  const addMessage = useCallback(async (msg: UIMessage) => {
    if (!token || !isAuthenticated || !currentChatId) {
      console.error('Cannot add message: not authenticated or no current chat');
      return;
    }

    try {
      // Add message to backend
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${currentChatId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...msg,
          createdAt: new Date()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedSession = data.session;
        
        // Update local state
        setChatSessions((prev) => {
          const updated = prev.map((session) => 
            session.id === currentChatId ? updatedSession : session
          );
          console.log('[ChatContext] addMessage: added message', msg, 'to session', currentChatId, 'updated sessions:', updated);
          return updated;
        });
      } else {
        console.error('Failed to add message to backend:', response.statusText);
        // Fallback to local state update
        setChatSessions((prev) => {
          let found = false;
          const updated = prev.map((session) => {
            if (session.id === currentChatId) {
              found = true;
              return {
                ...session,
                messages: [...session.messages, msg],
                title: session.customTitle || generateTitle([...session.messages, msg]),
              };
            }
            return session;
          });
          if (!found) {
            console.error('[ChatContext] addMessage: No session found for currentChatId', currentChatId, 'sessions:', prev);
            return prev;
          }
          console.log('[ChatContext] addMessage: added message', msg, 'to session', currentChatId, 'updated sessions:', updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error adding message to backend:', error);
      // Fallback to local state update
      setChatSessions((prev) => {
        let found = false;
        const updated = prev.map((session) => {
          if (session.id === currentChatId) {
            found = true;
            return {
              ...session,
              messages: [...session.messages, msg],
              title: session.customTitle || generateTitle([...session.messages, msg]),
            };
          }
          return session;
        });
        if (!found) {
          console.error('[ChatContext] addMessage: No session found for currentChatId', currentChatId, 'sessions:', prev);
          return prev;
        }
        console.log('[ChatContext] addMessage: added message', msg, 'to session', currentChatId, 'updated sessions:', updated);
        return updated;
      });
    }
  }, [currentChatId, token, isAuthenticated]);

  // Reset current chat (clear messages)
  const resetCurrentChat = useCallback(async () => {
    if (!token || !isAuthenticated || !currentChatId) {
      console.error('Cannot reset chat: not authenticated or no current chat');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${currentChatId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedSession = data.session;
        
        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === currentChatId ? updatedSession : session
          )
        );
      } else {
        console.error('Failed to reset chat on backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error resetting chat on backend:', error);
    }
  }, [currentChatId, token, isAuthenticated]);

  // Rename a chat
  const renameChat = useCallback(async (id: string, newName: string) => {
    if (!token || !isAuthenticated) {
      console.error('Cannot rename chat: not authenticated');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customTitle: newName
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedSession = data.session;
        
        setChatSessions((prev) =>
          prev.map((session) =>
            session.id === id ? updatedSession : session
          )
        );
      } else {
        console.error('Failed to rename chat on backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error renaming chat on backend:', error);
    }
  }, [token, isAuthenticated]);

  // Delete a chat
  const deleteChat = useCallback(async (id: string) => {
    if (!token || !isAuthenticated) {
      console.error('Cannot delete chat: not authenticated');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setChatSessions((prev) => {
          const updated = prev.filter((session) => session.id !== id);
          
          // If we deleted the current chat, switch to another one or start new
          if (id === currentChatId) {
            if (updated.length > 0) {
              setCurrentChatId(updated[0].id);
            } else {
              setCurrentChatId("");
            }
          }
          
          return updated;
        });
      } else {
        console.error('Failed to delete chat on backend:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting chat on backend:', error);
    }
  }, [currentChatId, token, isAuthenticated]);

  return (
    <ChatContext.Provider
      value={{
        chatSessions,
        currentChatId,
        currentMessages,
        loading,
        startNewChat,
        switchChat,
        addMessage,
        resetCurrentChat,
        renameChat,
        deleteChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};