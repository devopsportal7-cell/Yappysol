# Lovable Frontend Fix Prompt

## 🚨 URGENT: Frontend API Fixes Needed

**Issue**: Frontend is getting HTML responses instead of JSON, causing parsing errors in console. Users are stuck on onboarding and settings pages.

### 🔧 IMMEDIATE FIXES REQUIRED

#### 1. Fix API Endpoint URLs
All API calls are missing the correct prefix. Update these:

```typescript
// ❌ CURRENT (causing errors)
fetch('/password/validate', { ... })
fetch('/username/check', { ... })
fetch('/profile', { ... })

// ✅ CORRECT (use these)
fetch('/api/user/password/validate', { ... })
fetch('/api/user/username/check', { ... })
fetch('/api/user/profile', { ... })
```

#### 2. Fix Onboarding State Management
Users get stuck on username step after refresh. Implement this:

```typescript
// Add to onboarding component
useEffect(() => {
  checkUserOnboardingState();
}, []);

const checkUserOnboardingState = async () => {
  const response = await fetch('/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const data = await response.json();
  
  // Skip username step if already set
  if (data.user.username) {
    setCurrentStep(3); // Go to password step
  }
};
```

#### 3. Add Username Editing to Settings
Users need to change usernames. Implement this component:

```typescript
const UsernameEditComponent = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  
  const handleSave = async () => {
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ username: newUsername })
    });
    // Handle response...
  };
  
  return (
    <div className="username-settings">
      {!isEditing ? (
        <div>
          <span>{currentUsername}</span>
          <button onClick={() => setIsEditing(true)}>Edit</button>
        </div>
      ) : (
        <div>
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};
```

### 📋 COMPLETE API ENDPOINTS LIST

#### Password Management:
- `POST /api/user/password/set`
- `PUT /api/user/password/update`
- `POST /api/user/password/verify`
- `GET /api/user/password/status`
- `POST /api/user/password/validate`
- `POST /api/user/password/forgot`
- `POST /api/user/password/reset`

#### User Profile:
- `GET /api/user/username/check?username=xxx`
- `PATCH /api/user/profile`
- `GET /api/user/onboarding/status`

#### Whitelisted Addresses:
- `GET /api/user/whitelisted-addresses`
- `POST /api/user/whitelisted-addresses`
- `PUT /api/user/whitelisted-addresses/:id`
- `DELETE /api/user/whitelisted-addresses/:id`

### 🎯 PRIORITY ORDER

1. **CRITICAL**: Fix API endpoint URLs (fixes JSON parsing errors)
2. **HIGH**: Fix onboarding state management (users stuck on username step)
3. **MEDIUM**: Add username editing to settings page
4. **LOW**: Add debouncing to username checks (prevents rate limiting)

### ✅ EXPECTED RESULTS

After fixes:
- ✅ No more console JSON parsing errors
- ✅ Users can complete onboarding after refresh
- ✅ Username editing works in settings
- ✅ All password management works
- ✅ Whitelisted addresses work

### 📁 REFERENCE DOCUMENTS

I've created these guides for you:
- `Frontend_API_Error_Fix_Guide.md` - Complete API fix guide
- `Frontend_Onboarding_State_Management_Guide.md` - Onboarding fixes
- `Settings_Username_Editing_Guide.md` - Username editing implementation
- `Frontend_Username_Debouncing_Guide.md` - Rate limiting prevention

**Start with fixing the API endpoint URLs - this will immediately resolve the console errors and get users unstuck!**

---

## 🔍 DETAILED IMPLEMENTATION

### Password Validation Fix

```typescript
const PasswordValidationComponent: React.FC = () => {
  const [password, setPassword] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  const validatePassword = async () => {
    try {
      // ✅ CORRECT API call
      const response = await fetch('/api/user/password/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
      }
    } catch (error) {
      console.error('Password validation error:', error);
    }
  };

  return (
    <div className="password-validation">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter password"
      />
      <button onClick={validatePassword}>Validate Password</button>
      
      {validationResult && (
        <div className={`validation-result ${validationResult.valid ? 'success' : 'error'}`}>
          {validationResult.message}
        </div>
      )}
    </div>
  );
};
```

### Username Check Fix

```typescript
const UsernameCheckComponent: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const checkUsername = async (username: string) => {
    try {
      // ✅ CORRECT API call
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
  };

  return (
    <div className="username-check">
      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          checkUsername(e.target.value);
        }}
        placeholder="Enter username"
      />
      
      {isAvailable === true && <div className="success">✅ Username available!</div>}
      {isAvailable === false && <div className="error">❌ Username taken</div>}
    </div>
  );
};
```

### Onboarding State Management

```typescript
const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [userState, setUserState] = useState<any>(null);

  useEffect(() => {
    checkUserState();
  }, []);

  const checkUserState = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserState(data.user);
        
        // Determine current step based on user state
        if (!data.user.username) {
          setCurrentStep(2); // Username step
        } else if (!data.user.app_password_hash) {
          setCurrentStep(3); // Password step
        } else {
          setCurrentStep(4); // Complete
        }
      }
    } catch (error) {
      console.error('Error checking user state:', error);
    }
  };

  return (
    <div className="onboarding-flow">
      {currentStep === 2 && <UsernameStep user={userState} />}
      {currentStep === 3 && <PasswordStep user={userState} />}
      {currentStep === 4 && <CompleteStep user={userState} />}
    </div>
  );
};
```

### Settings Page Username Editing

```typescript
const SettingsPage: React.FC = () => {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      <div className="settings-section">
        <h2>Profile</h2>
        <UsernameEditComponent />
      </div>

      <div className="settings-section">
        <h2>Security</h2>
        <PasswordManagementComponent />
      </div>

      <div className="settings-section">
        <h2>Whitelisted Addresses</h2>
        <WhitelistedAddressesComponent />
      </div>
    </div>
  );
};
```

## 🚀 QUICK START CHECKLIST

- [ ] **Update all API calls** to use `/api/user/` prefix
- [ ] **Add proper headers** (Content-Type, Authorization)
- [ ] **Fix onboarding state management** to skip completed steps
- [ ] **Add username editing** to settings page
- [ ] **Test all functionality** after changes
- [ ] **Check console** for any remaining errors

**Priority: Start with API endpoint fixes - this will immediately resolve the JSON parsing errors!**
