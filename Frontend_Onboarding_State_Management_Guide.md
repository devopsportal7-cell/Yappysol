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
      return 5; // Complete
    }
    
    // Step 3: Password setup (if not set)
    if (user.username && !user.app_password_hash) return 3;
    
    // Step 4: Wallet setup (if not set)
    if (user.username && !user.hasWallet) return 4;
    
    // Step 5: Complete
    return 5;
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
      {currentStep === 5 && <CompleteStep user={userOnboardingState} />}
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

### 3. Add Backend Endpoint for Onboarding State

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
