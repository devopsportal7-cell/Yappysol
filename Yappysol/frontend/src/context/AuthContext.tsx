import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  loginWithPrivy: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  authType: 'jwt' | 'privy' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authType, setAuthType] = useState<'jwt' | 'privy' | null>(null);
  const navigate = useNavigate();
  
  // Check if Privy is configured
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
  const isPrivyConfigured = privyAppId && privyAppId !== 'your-privy-app-id';
  
  const { ready, authenticated, user: privyUser, login: privyLogin, logout: privyLogout, getAccessToken } = usePrivy();

  useEffect(() => {
    // Check for existing authentication on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedAuthType = localStorage.getItem('authType') as 'jwt' | 'privy' | null;

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setAuthType(storedAuthType);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('authType');
      }
    }
    setLoading(false);
  }, []);

  // Handle Privy authentication
  useEffect(() => {
    if (isPrivyConfigured && ready && authenticated && privyUser && !user) {
      handlePrivyLogin();
    }
  }, [isPrivyConfigured, ready, authenticated, privyUser]);

  const handlePrivyLogin = async () => {
    try {
      // Log what we actually get from Privy
      console.log('Frontend: Privy user object:', privyUser);
      console.log('Frontend: Privy user email:', privyUser?.email?.address);
      console.log('Frontend: Privy user ID:', privyUser?.id);
      
      // Get the access token from Privy using the hook method
      console.log('Frontend: Getting access token from Privy');
      const accessToken = await getAccessToken();
      console.log('Frontend: Access token length:', accessToken?.length);
      console.log('Frontend: Access token preview:', accessToken?.substring(0, 20) + '...');
      
      console.log('Frontend: Sending request to backend');
      const response = await fetch('/api/auth/privy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          privyToken: accessToken,
          privyUser: {
            id: privyUser?.id,
            email: privyUser?.email?.address
          }
        })
      });

      console.log('Frontend: Response status:', response.status);
      const data = await response.json();
      console.log('Frontend: Response data:', data);
      
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        setAuthType('privy');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('authType', 'privy');
        
        // Redirect to chat page after successful login
        navigate('/chat');
      } else {
        console.error('Privy authentication failed:', data.error);
      }
    } catch (error) {
      console.error('Privy login error:', error);
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setAuthType('jwt');
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('authType', 'jwt');
  };

  const loginWithPrivy = async () => {
    if (!isPrivyConfigured) {
      console.warn('Privy is not configured. Please set VITE_PRIVY_APP_ID environment variable.');
      return;
    }
    try {
      await privyLogin();
    } catch (error) {
      console.error('Privy login error:', error);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthType(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authType');
    
    if (isPrivyConfigured && authType === 'privy') {
      privyLogout();
    }
  };

  const isAuthenticated = !!token && !!user;

  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithPrivy,
    logout,
    isAuthenticated,
    loading: loading || (isPrivyConfigured && !ready),
    authType
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
