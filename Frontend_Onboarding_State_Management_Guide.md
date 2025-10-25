# Frontend Onboarding State Management Guide

## 🚨 Issue: User Stuck on Username Step

**Problem**: User sets username, refreshes page, and gets stuck because:
1. Frontend shows "Username is available!" 
2. Backend correctly says "Username already set"
3. Frontend doesn't know user's current onboarding state

## 🔧 Solution: Check Onboarding State on Page Load

### 1. Add Onboarding State Check

```typescript
// In your onboarding component
import { useState, useEffect } from 'react';

const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [userOnboardingState, setUserOnboardingState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserOnboardingState();
  }, []);

  const checkUserOnboardingState = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserOnboardingState(data.user);
        
        // Determine current step based on user state
        const step = determineCurrentStep(data.user);
        setCurrentStep(step);
      }
    } catch (error) {
      console.error('Error checking onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const determineCurrentStep = (user: any): number => {
    // Step 1: Welcome (always show)
    if (!user.username) return 2; // Username step
    
    // Step 2: Username (skip if already set)
    if (user.username && !user.onboardingCompleted) {
      // Check what other steps might be incomplete
      if (!user.app_password_hash) return 3; // Password step
      if (!user.hasWallet) return 4; // Wallet step
      if (!user.hasExportedPrivateKey) return 5; // Private key export step
      return 6; // Complete
    }
    
    // Step 3: Password setup (if not set)
    if (user.username && !user.app_password_hash) return 3;
    
    // Step 4: Wallet setup (if not set)
    if (user.username && !user.hasWallet) return 4;
    
    // Step 5: Private key export (if not exported)
    if (user.username && !user.hasExportedPrivateKey) return 5;
    
    // Step 6: Complete
    return 6;
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="onboarding-flow">
      {/* Show appropriate step based on user state */}
      {currentStep === 2 && <UsernameStep user={userOnboardingState} />}
      {currentStep === 3 && <PasswordStep user={userOnboardingState} />}
      {currentStep === 4 && <WalletStep user={userOnboardingState} />}
      {currentStep === 5 && <PrivateKeyExportStep user={userOnboardingState} />}
      {currentStep === 6 && <CompleteStep user={userOnboardingState} />}
    </div>
  );
};
```

### 2. Update Username Step Component

```typescript
const UsernameStep: React.FC<{ user: any }> = ({ user }) => {
  const [username, setUsername] = useState(user.username || '');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // If username is already set, show it and allow continue
  useEffect(() => {
    if (user.username) {
      setUsername(user.username);
      setIsAvailable(true);
    }
  }, [user.username]);

  const handleContinue = async () => {
    if (user.username) {
      // Username already set, just continue to next step
      onNextStep();
      return;
    }

    // Username not set, proceed with setting it
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          username: username,
          onboardingCompleted: false // Don't complete onboarding yet
        })
      });

      if (response.ok) {
        onNextStep();
      } else {
        const error = await response.json();
        console.error('Error setting username:', error);
      }
    } catch (error) {
      console.error('Error setting username:', error);
    }
  };

  return (
    <div className="username-step">
      <h2>Choose Your Username</h2>
      
      {user.username ? (
        <div className="username-already-set">
          <p>Your username is: <strong>{user.username}</strong></p>
          <p className="info">Username cannot be changed once set.</p>
          <p className="next-step">Next: Set up your password</p>
        </div>
      ) : (
        <div className="username-input">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
          
          {isChecking && <div className="checking">Checking...</div>}
          {isAvailable === true && <div className="success">✅ Username available!</div>}
          {isAvailable === false && <div className="error">❌ Username taken</div>}
        </div>
      )}

      <div className="step-actions">
        <button onClick={onPreviousStep}>Back</button>
        <button 
          onClick={handleContinue}
          disabled={!user.username && (!username || isAvailable === false)}
        >
          {user.username ? 'Continue to Password Setup' : 'Continue'}
        </button>
      </div>
    </div>
  );
};
```

### 3. Private Key Export Step Component

```typescript
const PrivateKeyExportStep: React.FC<{ user: any }> = ({ user }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [password, setPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedWallet, setExportedWallet] = useState(null);
  const [error, setError] = useState('');
  const [hasExported, setHasExported] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const response = await fetch('/api/user/private-keys', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      setWallets(data.wallets);
      if (data.wallets.length > 0) {
        setSelectedWalletId(data.wallets[0].id);
      }
    } catch (error) {
      setError('Failed to load wallets');
    }
  };

  const handleExport = async () => {
    if (!selectedWalletId || !password) {
      setError('Please select a wallet and enter your password');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const response = await fetch('/api/user/private-keys/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          walletId: selectedWalletId,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExportedWallet(data.wallet);
        setHasExported(true);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to export private key');
      }
    } catch (error) {
      setError('Network error exporting private key');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success message
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadPrivateKey = () => {
    if (!exportedWallet) return;

    const content = `Solana Wallet Private Key Export
Generated: ${new Date().toISOString()}

Wallet Information:
- Public Key: ${exportedWallet.publicKey}
- Private Key: ${exportedWallet.privateKey}
- Created: ${exportedWallet.createdAt}

⚠️ SECURITY WARNING:
- Keep this private key secure and never share it
- Anyone with this private key can access your wallet
- Store it in a safe place offline
- Consider using a hardware wallet for better security

This file was generated by Yappysol on ${new Date().toLocaleString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solana-wallet-${exportedWallet.publicKey.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (hasExported && exportedWallet) {
    return (
      <div className="onboarding-step private-key-export-step">
        <div className="step-header">
          <h2>🔐 Export Your Private Key</h2>
          <p>Step 5 of 6 - Keep your private key safe!</p>
        </div>

        <div className="export-success">
          <div className="success-icon">✅</div>
          <h3>Private Key Exported Successfully!</h3>
          
          <div className="wallet-info">
            <div className="info-item">
              <label>Public Key:</label>
              <div className="key-display">
                <code>{exportedWallet.publicKey}</code>
                <button 
                  onClick={() => copyToClipboard(exportedWallet.publicKey)}
                  className="copy-button"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="info-item">
              <label>Private Key:</label>
              <div className="key-display">
                <code className="private-key">{exportedWallet.privateKey}</code>
                <button 
                  onClick={() => copyToClipboard(exportedWallet.privateKey)}
                  className="copy-button"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>

          <div className="security-warning">
            <h4>⚠️ Important Security Information</h4>
            <ul>
              <li>Keep this private key secure and never share it</li>
              <li>Anyone with this private key can access your wallet</li>
              <li>Store it in a safe place offline</li>
              <li>Consider using a hardware wallet for better security</li>
            </ul>
          </div>

          <div className="export-actions">
            <button onClick={downloadPrivateKey} className="download-button">
              📥 Download as File
            </button>
          </div>
        </div>

        <div className="step-actions">
          <button onClick={onPreviousStep}>Back</button>
          <button onClick={onNextStep} className="primary-button">
            Continue to Complete Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-step private-key-export-step">
      <div className="step-header">
        <h2>🔐 Export Your Private Key</h2>
        <p>Step 5 of 6 - Save your private key for backup</p>
      </div>

      <div className="step-content">
        <div className="info-section">
          <h3>Why Export Your Private Key?</h3>
          <ul>
            <li>Backup your wallet in case you lose access</li>
            <li>Import your wallet into other applications</li>
            <li>Use your wallet with hardware devices</li>
            <li>Have full control over your funds</li>
          </ul>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="wallet-selection">
          <label>Select Wallet to Export:</label>
          <select 
            value={selectedWalletId} 
            onChange={(e) => setSelectedWalletId(e.target.value)}
            disabled={wallets.length === 0}
          >
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.publicKey} {wallet.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="password-section">
          <label>Enter Your Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password to export private key"
            className="password-input"
          />
        </div>

        <div className="export-section">
          <button 
            onClick={handleExport}
            disabled={!selectedWalletId || !password || isExporting}
            className="export-button"
          >
            {isExporting ? 'Exporting...' : '🔐 Export Private Key'}
          </button>
        </div>

        <div className="skip-option">
          <p>Don't want to export now? You can do this later in Settings.</p>
          <button onClick={onNextStep} className="skip-button">
            Skip for Now
          </button>
        </div>
      </div>

      <div className="step-actions">
        <button onClick={onPreviousStep}>Back</button>
        <button 
          onClick={onNextStep} 
          disabled={!hasExported}
          className="primary-button"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
```

### 4. Add Backend Endpoint for Onboarding State

```typescript
// In your backend routes
router.get('/onboarding/status', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Determine onboarding progress
  const progress = {
    step: 1,
    completed: user.onboarding_completed,
    username: user.username,
    hasPassword: !!user.app_password_hash,
    hasWallet: false, // You'll need to check wallet status
    canProceed: true
  };

  // Determine current step
  if (!user.username) {
    progress.step = 2; // Username step
    progress.canProceed = false;
  } else if (!user.app_password_hash) {
    progress.step = 3; // Password step
  } else if (!progress.hasWallet) {
    progress.step = 4; // Wallet step
  } else {
    progress.step = 5; // Complete
  }

  res.json({
    success: true,
    progress
  });
}));
```

### 4. Frontend Integration

```typescript
// In your main onboarding component
const OnboardingFlow: React.FC = () => {
  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/user/onboarding/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOnboardingProgress(data.progress);
      }
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading onboarding status...</div>;
  }

  return (
    <div className="onboarding-flow">
      <div className="progress-bar">
        Step {onboardingProgress.step} of 5
      </div>

      {onboardingProgress.step === 2 && (
        <UsernameStep 
          progress={onboardingProgress}
          onNext={fetchOnboardingStatus} // Refresh status after completion
        />
      )}
      
      {onboardingProgress.step === 3 && (
        <PasswordStep 
          progress={onboardingProgress}
          onNext={fetchOnboardingStatus}
        />
      )}
      
      {/* ... other steps */}
    </div>
  );
};
```

## 🎯 Key Benefits

1. **✅ No More Stuck Users**: Frontend knows current state
2. **✅ Proper Step Skipping**: Skip completed steps automatically  
3. **✅ Better UX**: Show current username if already set
4. **✅ State Persistence**: Survives page refreshes
5. **✅ Clear Progress**: User knows where they are in the flow

## 📋 Implementation Checklist

- [ ] **Add onboarding status check** on page load
- [ ] **Update username step** to handle already-set usernames
- [ ] **Add backend endpoint** for onboarding progress
- [ ] **Implement step determination** logic
- [ ] **Add proper error handling** for state checks
- [ ] **Test with page refresh** scenarios

## 🚀 Result

After implementing this:
- ✅ User refreshes page → sees correct step
- ✅ Username already set → shows current username, allows continue
- ✅ Clear progress indication
- ✅ No more "Username is available!" when it's already set

This will solve the stuck user issue and provide a much better onboarding experience!
