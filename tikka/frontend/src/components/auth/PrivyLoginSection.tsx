import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const PrivyLoginSection: React.FC = () => {
  const { loginWithPrivy } = useAuth();
  
  // Check if Privy is configured
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
  const isPrivyConfigured = privyAppId && privyAppId !== 'your-privy-app-id';

  if (!isPrivyConfigured) {
    return null; // Don't render if Privy is not configured
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      
      <Button
        onClick={loginWithPrivy}
        variant="outline"
        className="w-full"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Continue with Privy
      </Button>
    </div>
  );
};

export default PrivyLoginSection;
