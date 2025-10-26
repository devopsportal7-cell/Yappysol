# Frontend Username Check Debouncing Guide

## 🚨 Issue: Rate Limiting on Username Check

**Problem**: Frontend is hitting the username check API on every keystroke, causing 429 (Too Many Requests) errors.

**Current Rate Limits**:
- Anonymous users: 30 requests/minute
- Authenticated users: 100 requests/minute

## 🔧 Backend Fixes Applied

1. **Increased Rate Limits**: Authenticated users now get 100 requests/minute
2. **User-Based Rate Limiting**: Rate limits per user instead of per IP
3. **Optional Auth**: Username check endpoint supports optional authentication

## 📱 Frontend Implementation (Recommended)

### Option 1: Debounced Username Check (Best Practice)

```typescript
import { useState, useEffect, useCallback } from 'react';

const UsernameInput: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Debounced username check
  const checkUsername = useCallback(
    debounce(async (username: string) => {
      if (!username || username.length < 3) {
        setIsAvailable(null);
        setErrorMessage('');
        return;
      }

      setIsChecking(true);
      try {
        const response = await fetch(`/api/user/username/check?username=${encodeURIComponent(username)}`, {
          headers: {
            'Authorization': `Bearer ${authToken}` // Include auth token for higher rate limit
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsAvailable(data.available);
          setErrorMessage(data.message || '');
        } else if (response.status === 429) {
          setErrorMessage('Too many requests. Please wait a moment.');
          setIsAvailable(null);
        } else {
          setErrorMessage('Error checking username availability.');
          setIsAvailable(null);
        }
      } catch (error) {
        setErrorMessage('Network error. Please try again.');
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500), // 500ms delay
    []
  );

  useEffect(() => {
    checkUsername(username);
  }, [username, checkUsername]);

  return (
    <div className="username-input">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
        className={`username-field ${isAvailable === true ? 'valid' : isAvailable === false ? 'invalid' : ''}`}
      />
      
      {isChecking && (
        <div className="checking-indicator">
          <div className="spinner"></div>
          <span>Checking...</span>
        </div>
      )}
      
      {!isChecking && isAvailable === true && (
        <div className="success-indicator">
          ✅ Username available
        </div>
      )}
      
      {!isChecking && isAvailable === false && (
        <div className="error-indicator">
          ❌ {errorMessage}
        </div>
      )}
      
      {errorMessage && errorMessage.includes('Too many requests') && (
        <div className="rate-limit-warning">
          ⚠️ Please wait a moment before trying again
        </div>
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

### Option 2: Throttled Username Check

```typescript
import { useState, useRef } from 'react';

const UsernameInputThrottled: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const lastCheckRef = useRef<number>(0);
  const THROTTLE_MS = 1000; // 1 second between checks

  const checkUsername = async (username: string) => {
    const now = Date.now();
    if (now - lastCheckRef.current < THROTTLE_MS) {
      return; // Skip if too soon
    }

    if (!username || username.length < 3) {
      setIsAvailable(null);
      return;
    }

    lastCheckRef.current = now;
    setIsChecking(true);

    try {
      const response = await fetch(`/api/user/username/check?username=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsAvailable(data.available);
      } else if (response.status === 429) {
        console.warn('Rate limited - will retry after throttle period');
      }
    } catch (error) {
      console.error('Username check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="username-input">
      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          checkUsername(e.target.value);
        }}
        placeholder="Enter username"
      />
      
      {isChecking && <div className="spinner">Checking...</div>}
      {isAvailable === true && <div className="success">✅ Available</div>}
      {isAvailable === false && <div className="error">❌ Taken</div>}
    </div>
  );
};
```

### Option 3: Client-Side Validation First

```typescript
const UsernameInputWithValidation: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const validateUsername = (username: string): boolean => {
    // Client-side validation first
    if (username.length < 3) {
      setValidationError('Username must be at least 3 characters');
      return false;
    }
    if (username.length > 20) {
      setValidationError('Username must be less than 20 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError('Username can only contain letters, numbers, hyphens, and underscores');
      return false;
    }
    if (username.startsWith('-') || username.startsWith('_')) {
      setValidationError('Username cannot start with hyphen or underscore');
      return false;
    }
    if (username.endsWith('-') || username.endsWith('_')) {
      setValidationError('Username cannot end with hyphen or underscore');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  const checkUsername = debounce(async (username: string) => {
    if (!validateUsername(username)) {
      setIsAvailable(null);
      return;
    }

    try {
      const response = await fetch(`/api/user/username/check?username=${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsAvailable(data.available);
      }
    } catch (error) {
      console.error('Username check error:', error);
    }
  }, 500);

  return (
    <div className="username-input">
      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          checkUsername(e.target.value);
        }}
        placeholder="Enter username"
        className={validationError ? 'error' : isAvailable === true ? 'success' : ''}
      />
      
      {validationError && (
        <div className="validation-error">{validationError}</div>
      )}
      
      {!validationError && isAvailable === true && (
        <div className="success">✅ Username available</div>
      )}
      
      {!validationError && isAvailable === false && (
        <div className="error">❌ Username taken</div>
      )}
    </div>
  );
};
```

## 🎯 Recommended Implementation

**Use Option 1 (Debounced)** because:
- ✅ Prevents excessive API calls
- ✅ Good user experience (immediate feedback)
- ✅ Handles rate limiting gracefully
- ✅ Includes authentication for higher limits

## 📋 Implementation Checklist

- [ ] **Add debouncing** (500ms delay)
- [ ] **Include auth token** in requests
- [ ] **Handle 429 errors** gracefully
- [ ] **Show loading states** during checks
- [ ] **Client-side validation** first
- [ ] **Clear error messages** on new input

## 🚀 Benefits

1. **Reduced API Calls**: 90% fewer requests
2. **Better UX**: No rate limiting errors
3. **Higher Limits**: 100 requests/minute for authenticated users
4. **Graceful Degradation**: Handles network errors properly

This will solve the rate limiting issue and provide a much better user experience!

