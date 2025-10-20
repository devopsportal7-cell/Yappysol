import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface WalletInfo {
  id: string;
  publicKey: string;
  balance: number;
  isImported: boolean;
  isDefault: boolean;
}

interface WalletContextType {
  wallet: WalletInfo | null;
  loading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, isAuthenticated } = useAuth();

  const fetchWallet = async () => {
    if (!token || !isAuthenticated) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/wallets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet');
      }

      const data = await response.json();
      
      if (data.wallets && data.wallets.length > 0) {
        // Use the first wallet (should be the auto-created one)
        const walletData = data.wallets[0];
        console.log('Wallet data received:', walletData);
        
        // Validate wallet data
        if (walletData && walletData.id && walletData.publicKey) {
          setWallet(walletData);
        } else {
          console.error('Invalid wallet data:', walletData);
          setWallet(null);
        }
      } else {
        setWallet(null);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet');
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshWallet = async () => {
    await fetchWallet();
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchWallet();
    } else {
      setWallet(null);
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  const value: WalletContextType = {
    wallet,
    loading,
    error,
    refreshWallet
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
