# Frontend API Error Fix Guide

## 🚨 Issue: JSON Parsing Errors

**Problem**: Frontend is getting HTML responses instead of JSON, causing parsing errors:
- `SyntaxError: Unexpected token 's', "setImmedia"... is not valid JSON`
- `Password validation error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Root Cause**: Frontend is calling wrong API endpoints or hitting non-existent routes.

## 🔧 Correct API Endpoints

### Password Management
```typescript
// ✅ CORRECT endpoints
POST /api/user/password/set          // Set password
PUT /api/user/password/update         // Update password  
POST /api/user/password/verify        // Verify password
GET /api/user/password/status         // Get password status
POST /api/user/password/validate      // Validate password format
POST /api/user/password/forgot        // Forgot password
POST /api/user/password/reset         // Reset password
GET /api/user/password/reset/verify/:token  // Verify reset token
```

### User Profile
```typescript
// ✅ CORRECT endpoints
GET /api/user/username/check?username=xxx    // Check username availability
PATCH /api/user/profile                     // Update profile
GET /api/user/onboarding/status             // Get onboarding status
```

### Whitelisted Addresses
```typescript
// ✅ CORRECT endpoints
GET /api/user/whitelisted-addresses         // Get addresses
POST /api/user/whitelisted-addresses       // Add address
PUT /api/user/whitelisted-addresses/:id    // Update address
DELETE /api/user/whitelisted-addresses/:id // Delete address
POST /api/user/whitelisted-addresses/check // Check address
```

## 🛠️ Frontend Fixes

### 1. Update API Calls

**Before (Incorrect)**:
```typescript
// ❌ WRONG - Missing /api/user prefix
fetch('/password/validate', {
  method: 'POST',
  body: JSON.stringify({ password })
});
```

**After (Correct)**:
```typescript
// ✅ CORRECT - Full API path
fetch('/api/user/password/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({ password })
});
```

### 2. Password Validation Component Fix

```typescript
const PasswordValidationComponent: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validatePassword = async () => {
    setIsValidating(true);
    try {
      // ✅ CORRECT API call
      const response = await fetch('/api/user/password/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          password: password,
          confirmPassword: confirmPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
      } else {
        const error = await response.json();
        console.error('Password validation error:', error);
        setValidationResult({ valid: false, message: error.message });
      }
    } catch (error) {
      console.error('Network error:', error);
      setValidationResult({ valid: false, message: 'Network error' });
    } finally {
      setIsValidating(false);
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
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
      />
      <button onClick={validatePassword} disabled={isValidating}>
        {isValidating ? 'Validating...' : 'Validate Password'}
      </button>
      
      {validationResult && (
        <div className={`validation-result ${validationResult.valid ? 'success' : 'error'}`}>
          {validationResult.message}
        </div>
      )}
    </div>
  );
};
```

### 3. API Service Helper

```typescript
// Create a centralized API service
class ApiService {
  private static baseUrl = '/api';
  
  static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Password methods
  static async validatePassword(password: string, confirmPassword?: string) {
    return this.makeRequest('/user/password/validate', {
      method: 'POST',
      body: JSON.stringify({ password, confirmPassword })
    });
  }

  static async setPassword(password: string) {
    return this.makeRequest('/user/password/set', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  static async verifyPassword(password: string) {
    return this.makeRequest('/user/password/verify', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  // Username methods
  static async checkUsername(username: string) {
    return this.makeRequest(`/user/username/check?username=${encodeURIComponent(username)}`);
  }

  static async updateProfile(updates: any) {
    return this.makeRequest('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Whitelisted addresses methods
  static async getWhitelistedAddresses() {
    return this.makeRequest('/user/whitelisted-addresses');
  }

  static async addWhitelistedAddress(address: string, label: string) {
    return this.makeRequest('/user/whitelisted-addresses', {
      method: 'POST',
      body: JSON.stringify({ address, label })
    });
  }
}

// Usage example
const handlePasswordValidation = async () => {
  try {
    const result = await ApiService.validatePassword(password, confirmPassword);
    console.log('Validation result:', result);
  } catch (error) {
    console.error('Validation failed:', error);
  }
};
```

## 🔍 Debugging Steps

### 1. Check Network Tab
- Open browser DevTools → Network tab
- Look for failed requests (red status codes)
- Check if requests are hitting correct endpoints

### 2. Verify API Responses
- Check if responses are JSON or HTML
- Look for CORS errors
- Verify authentication headers

### 3. Test API Endpoints
```bash
# Test password validation endpoint
curl -X POST http://localhost:3000/api/user/password/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"password": "test123"}'
```

## 📋 Quick Fix Checklist

- [ ] **Update all API calls** to use correct `/api/user/` prefix
- [ ] **Add proper headers** (Content-Type, Authorization)
- [ ] **Handle JSON parsing errors** gracefully
- [ ] **Test all endpoints** in Network tab
- [ ] **Verify authentication** is working
- [ ] **Check CORS configuration** if needed

## 🚀 Expected Results

After fixing the API endpoints:
- ✅ No more JSON parsing errors
- ✅ Proper API responses
- ✅ Password validation working
- ✅ Username checking working
- ✅ All settings functionality working

The main issue is missing the `/api/user/` prefix in API calls. Once fixed, all the JSON parsing errors should disappear!
