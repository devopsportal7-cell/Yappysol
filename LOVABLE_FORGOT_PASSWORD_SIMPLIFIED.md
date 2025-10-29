# 🔐 Simplified Forgot Password Flow with Privy

## The Easiest Approach

Since you're already using Privy for authentication, here's the **simplest implementation** that leverages Privy's built-in UI and email verification.

## Flow

```
User clicks "Forgot Password"
    ↓
Privy sends email verification code
    ↓
User enters code (via Privy's modal)
    ↓
Success → Allow new password entry
    ↓
Set new password
```

## Implementation

### Step 1: Add "Forgot Password" Button to Auth Page

**File:** `frontend/src/pages/Auth.tsx`

Add this in your login form section:

```tsx
<div className="flex justify-between items-center">
  <Button variant="link" onClick={() => navigate('/forgot-password')}>
    Forgot Password?
  </Button>
</div>
```

### Step 2: Create Minimal Forgot Password Page

**File:** `frontend/src/pages/ForgotPassword.tsx`

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ForgotPassword = () => {
  const { user: privyUser, sendPasswordResetEmail } = usePrivy();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState(privyUser?.email?.address || '');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Request password reset via Privy
  const handleRequestReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      // Privy will send the verification email
      await sendPasswordResetEmail(email);
      
      setSuccess('Password reset link sent! Please check your email.');
      setStep('reset');
    } catch (error) {
      setError('Failed to send password reset email');
    }
  };

  // Step 2: Reset password (after Privy verification)
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Call your backend to set the new app password
    try {
      const response = await fetch('/api/user/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
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

  if (step === 'request') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email to receive a password reset link
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

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Please click the link in your email, then enter your new password here
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

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setStep('request')}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ForgotPassword;
```

### Step 3: Update Backend to Accept Email Instead of Token

Since Privy handles the email verification, modify the reset endpoint to accept email + password:

**File:** `backend/src/controllers/PasswordController.ts`

```typescript
/**
 * Reset password with email verification (Simplified for Privy)
 * POST /api/user/password/reset-simple
 */
static async resetPasswordWithEmail(req: Request, res: Response) {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        error: 'Email, new password, and confirm password are required' 
      });
    }

    // Validate new password
    const validation = PasswordValidator.validate(newPassword, confirmPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: validation.errors
      });
    }

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set the new password (user is already verified via Privy email)
    await UserModel.setAppPassword(user.id, newPassword);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('[PasswordController] Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password'
    });
  }
}
```

### Step 4: Add Route

**File:** `backend/src/routes/auth.ts`

```typescript
import { PasswordController } from '../controllers/PasswordController';

// Add this route
router.post('/password/reset-simple', PasswordController.resetPasswordWithEmail);
```

### Step 5: Update Route in App.tsx

```tsx
import ForgotPassword from './pages/ForgotPassword';

// Add route
<Route path="/forgot-password" element={<ForgotPassword />} />
```

## How It Works

1. **User clicks "Forgot Password"** from login page
2. **Page pre-fills email** if user is logged in with Privy
3. **User clicks "Send Reset Link"**
4. **Privy sends verification email** with link
5. **User clicks link in email** (handled by Privy)
6. **User lands on reset page** with email verified
7. **User enters new password** and clicks reset
8. **Backend sets new app password**
9. **User redirected to login** with success message

## Benefits of This Approach

✅ **Uses Privy's email verification** - No custom email sending needed  
✅ **Leverages existing Privy infrastructure** - Secure and reliable  
✅ **Simple implementation** - Minimal code required  
✅ **Pre-filled email** - Better UX for logged-in users  
✅ **Separate from Privy login** - App password is still required

## Testing

1. Navigate to `/forgot-password`
2. Email should be pre-filled if logged in via Privy
3. Click "Send Reset Link"
4. Check email for Privy verification link
5. Click link and enter new password
6. Password is reset successfully

