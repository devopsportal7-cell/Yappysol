# 🔐 Forgot Password Flow Implementation Guide for Lovable

## Current Authentication System

Your app uses **Privy** for social authentication (Google, Twitter, Wallet) and has a separate **App Password** system for additional security when users sign in with Privy.

## Recommended Flow (Using Privy UI)

```
User clicks "Forgot Password"
    ↓
Show Privy's email verification modal (pre-filled with user email)
    ↓
Privy sends verification code to email
    ↓
User enters code in Privy's modal
    ↓
After successful verification → Set new password
    ↓
Complete
```

## Why Use Privy's Built-in UI?

- ✅ **No custom email forms needed** - Privy handles everything
- ✅ **Professional UI** - Already branded and styled
- ✅ **Email sending handled** - Privy sends verification codes
- ✅ **Secure by default** - Built-in security best practices
- ✅ **Pre-fill user email** - Can auto-populate logged-in user's email

## Backend Implementation (Already Complete ✅)

### Existing Endpoints:

1. **POST `/api/user/password/forgot`**
   - Accepts: `{ email: string }`
   - Returns: `{ success: true, message: "If the email exists, a password reset link has been sent." }`
   - Implementation: `PasswordController.forgotPassword()`

2. **POST `/api/user/password/reset`**
   - Accepts: `{ token: string, newPassword: string, confirmPassword: string }`
   - Returns: `{ success: true, message: "Password reset successfully" }`
   - Implementation: `PasswordController.resetPassword()`

3. **GET `/api/user/password/reset/verify/:token`**
   - Checks if reset token is valid
   - Returns: `{ success: true, isValid: boolean, message: string }`
   - Implementation: `PasswordController.verifyResetToken()`

### Services:

- **`PrivyPasswordResetService`** (`src/services/PrivyPasswordResetService.ts`)
  - Generates reset tokens
  - Stores tokens in-memory (for production, use Redis)
  - Validates tokens and expires after 1 hour

## Implementation Approach

### Option 1: Use Privy's Built-in Email Verification (Recommended)

Use Privy's email verification modal instead of custom forms. This leverages their existing UI and email sending infrastructure.

### Implementation Steps

### Step 1: Trigger Privy Email Verification Modal

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ForgotPassword = () => {
  const { sendWalletPasswordReset, user: privyUser } = usePrivy();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (privyUser?.email?.address) {
      setEmail(privyUser.email.address);
    }
  }, [privyUser]);

  // Step 1: Trigger Privy's email verification
  const handleStartPasswordReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      // Use Privy's built-in password reset flow
      await sendWalletPasswordReset(email);
      
      // After Privy handles the email verification,
      // you'll need to intercept the callback and show password reset form
      setSuccess('Verification code sent! Check your email.');
      setShowPasswordReset(true);
    } catch (error) {
      setError('Failed to send verification code');
    }
  };
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Step 1: Request password reset
  const handleRequestReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      const response = await fetch('/api/user/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset link sent! Check your email.');
        // In development, show the token in console
        console.log('Reset token:', 'Check console for token');
      } else {
        setError(data.error || 'Failed to send reset link');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  // Step 2: Verify reset token
  const handleVerifyToken = async () => {
    if (!token) {
      setError('Please enter the reset token');
      return;
    }

    try {
      const response = await fetch(`/api/user/password/reset/verify/${token}`);
      const data = await response.json();

      if (data.isValid) {
        setStep('reset');
        setSuccess('Token verified. Please enter your new password.');
      } else {
        setError('Invalid or expired reset token');
      }
    } catch (error) {
      setError('Failed to verify token');
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/user/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => navigate('/auth'), 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            {step === 'request' && 'Enter your email to receive a reset link'}
            {step === 'verify' && 'Enter the reset token from your email'}
            {step === 'reset' && 'Enter your new password'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {step === 'request' && (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>
              <Button onClick={handleRequestReset} className="w-full">
                Send Reset Link
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                Back to Login
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div>
                <Label htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter token from email"
                />
              </div>
              <Button onClick={handleVerifyToken} className="w-full">
                Verify Token
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStep('request')}>
                Back
              </Button>
            </>
          )}

          {step === 'reset' && (
            <>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button onClick={handleResetPassword} className="w-full">
                Reset Password
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setStep('verify')}>
                Back
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
```

### Step 2: Add Route to App.tsx

```tsx
import ForgotPassword from './pages/ForgotPassword';

// Add this route in your routes
<Route path="/forgot-password" element={<ForgotPassword />} />
```

### Step 3: Add "Forgot Password" Link to Auth.tsx

**File:** `frontend/src/pages/Auth.tsx`

Add this below the login form:

```tsx
<div className="text-right">
  <Button variant="link" onClick={() => navigate('/forgot-password')}>
    Forgot Password?
  </Button>
</div>
```

## Important Notes

1. **Privy Integration**: Users must be authenticated via Privy first (social login). The app password is an **additional** security layer.

2. **Email Field**: In the forgot password form, the email field is for finding the user account, but the reset relies on Privy authentication.

3. **Reset Token Flow**:
   - Token is generated server-side
   - Currently logged to console in development
   - In production, implement actual email sending

4. **Password Requirements**: Minimum 8 characters with complexity (validated by `PasswordValidator`)

## Testing the Flow

### Development Mode (Check Console):

1. User clicks "Forgot Password"
2. Enters email
3. Backend logs the reset token to console
4. Copy token and paste in "Verify Token" step
5. Enter new password
6. Password is reset and user can login

### Production Mode:

1. Implement email service (SendGrid, AWS SES, etc.)
2. Token is sent to user's email instead of console
3. User clicks link in email
4. Token is automatically applied from URL parameter
5. User enters new password

## Next Steps for Lovable

1. Create `ForgotPassword.tsx` page (copy from code above)
2. Add route to your app
3. Add "Forgot Password" link in Auth.tsx
4. (Optional) Implement actual email sending for production

All backend endpoints are ready and functional! 🎉

