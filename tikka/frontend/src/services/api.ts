export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export async function sendChatMessage(message: string, context: any = {}, sessionId?: string) {
  // Get user info from localStorage
  const user = localStorage.getItem('user');
  const userId = user ? JSON.parse(user).id : null;
  
  // Add userId to context if available
  const enhancedContext = {
    ...context,
    ...(userId && { userId })
  };

  // Handle image step: send file as multipart/form-data
  if (context.currentStep === 'image' && context.attachments && context.attachments.length > 0) {
    const formData = new FormData();
    // Assume attachments[0] is a File or has a .file property
    const file = context.attachments[0].file || context.attachments[0];
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    if (token) {
      formData.append('token', token);
    }
    
    // Add userId to form data
    if (userId) {
      formData.append('userId', userId);
    }
    
    // Add any other fields needed by backend
    const endpoint = `${API_BASE_URL}/api/chat/token-creation`;
    console.log('[API] Sending image step to endpoint:', endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to send image');
    return res.json();
  }

  // Default: send as JSON
  // For now, we'll create a simple message endpoint or use a default session
  // TODO: This should be updated to use proper session management
  const endpoint = `${API_BASE_URL}/api/chat/message`;
  console.log('[API] Sending chat message to endpoint:', endpoint);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, context: enhancedContext, sessionId }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

// Auth API functions
export async function register(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }
  
  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  
  return response.json();
}

export async function importWallet(privateKey: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/import-wallet`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ privateKey })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import wallet');
  }
  
  return response.json();
}

export async function getUserWallets() {
  const response = await fetch(`${API_BASE_URL}/api/auth/wallets`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch wallets');
  }
  
  return response.json();
}

export async function verifyToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    throw new Error('Token verification failed');
  }
  
  return response.json();
} 