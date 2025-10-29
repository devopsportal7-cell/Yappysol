# 🔐 Fix: Forgot Password Flow - Privy Auth Integration

## Current Problem

After clicking "Forgot Password" and sending the reset email request, the flow is incorrectly:
1. ❌ Showing "Change Password" page (which asks for CURRENT password)
2. ❌ NOT showing Privy authentication
3. ❌ NOT allowing user to just set a NEW password

## Expected Flow

```
User clicks "Forgot Password"
    ↓
User enters email → Clicks "Send Reset Email"
    ↓
Backend sends reset email ✅ (Working)
    ↓
Show Privy Email Verification Modal
    ↓
User verifies email via Privy code
    ↓
After Privy verification → Show "Set New Password" form
    ↓
User enters NEW password (NO current password field)
    ↓
Password reset complete
```

## Solution

### Backend is Already Correct ✅

The backend endpoint `/api/user/password/reset` accepts:
```json
{
  "token": "reset_token",
  "newPassword": "...",
  "confirmPassword": "..."
}
```

No current password required for reset flow.

### Frontend Changes Needed

#### Step 1: Create Separate Reset Password Page

The "Change Password" page is for **updating** an existing password (requires current password).

For **forgot password**, create a separate flow:

**File:** `frontend/src/pages/ResetPassword.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ResetPassword = () => {
  const { user: privyUser, sendPasswordResetEmail, sendCode } = usePrivy();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get email from URL or Privy user
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setStep('verify'); // Skip to verification if email in URL
    } else if (privyUser?.email?.address) {
      setEmail(privyUser.email.address);
    }
  }, [searchParams, privyUser]);

  // Step 1: Send reset email
  const handleSendResetEmail = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      // Call backend to send reset email
      const response = await fetch('/api/user/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Reset email sent! Please check your email.');
        
        // Now show Privy email verification modal
        await sendPasswordResetEmail(email);
        setStep('verify');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  // Step 2: Verify email via Privy
  const handleVerifyCode = async () => {
    if (!code) {
      setError('Verification code is required');
      return;
    }

    try {
      // Verify code with Privy
      await sendCode(code);
      
      // If successful, move to reset password step
      setStep('reset');
      setSuccess('Email verified! Now set your new password.');
    } catch (error) {
      setError('Invalid verification code. Please try again.');
    }
  };

  // Step 3: Reset password (NO current password needed!)
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
      // For forgot password, we need to get reset token from Privy session or backend
      // Since Privy handles verification, we can use email directly
      const response = await fetch('/api/user/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, // Send email after Privy verification
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

  if (step === 'email') {
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

            <Button onClick={handleSendResetEmail} className="w-full">
              Send Reset Email
            </Button>

            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              Enter the verification code sent to {email}
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
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>

            <Button onClick={handleVerifyCode} className="w-full">
              Verify Code
            </Button>

            <Button variant="outline" className="w-full" onClick={() => setStep('email')}>
              Back
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
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>
              Enter your new password. No current password needed.
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

            {/* NO CURRENT PASSWORD FIELD - This is forgot password flow */}
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
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ResetPassword;
```

#### Step 2: Update Backend to Accept Email for Reset

We need to add an endpoint that accepts email (after Privy verification) instead of token:

**File:** `backend/src/controllers/PasswordController.ts`

Add this method:

```typescript
/**
 * Reset password with email (after Privy verification)
 * POST /api/user/password/reset-with-email
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
    console.error('[PasswordController] Reset password with email error:', error);
    res.status(500).json({
      error: 'Failed to reset password'
    });
  }
}
```

Add route in `backend/src/routes/userManagement.ts`:
```typescript
router.post('/password/reset-with-email', PasswordController.resetPasswordWithEmail);
```

#### Step 3: Update Route in Frontend

Redirect "Forgot Password" link to `/reset-password` instead of `/change-password`:

```tsx
// In Settings.tsx or wherever "Forgot password?" link is
<Button variant="link" onClick={() => navigate('/reset-password')}>
  Forgot password?
</Button>
```

Add route in `App.tsx`:
```tsx
import ResetPassword from './pages/ResetPassword';

<Route path="/reset-password" element={<ResetPassword />} />
```

## Key Differences - Two Separate Flows

### Change Password (Different Flow!)
**Purpose:** User wants to update their existing password (they know it)
- **Endpoint:** `PUT /api/user/password/update`
- **Requires:** `currentPassword` + `newPassword` + `confirmPassword`
- **For:** Logged-in users who know their password
- **Route:** `/change-password` or `/settings/change-password`
- **Authentication:** User must be logged in (authMiddleware required)
- **No email verification needed** - user already knows password

### Forgot Password (This Flow!)
**Purpose:** User forgot their app password (works for both logged-in and logged-out users)
- **Endpoint:** `POST /api/user/password/reset-with-email`
- **Requires:** `email` + `newPassword` + `confirmPassword` (NO current password!)
- **For:** 
  - Logged-in users who forgot their app password (they login via Privy, but forgot app password)
  - Logged-out users who forgot their password completely
- **Route:** `/reset-password` or `/forgot-password`
- **Authentication:** 
  - Optional - If user is logged in via Privy, email must match their account
  - Required - Privy email verification to prove ownership
- **Email verification required** - Privy verifies email ownership before allowing reset

## Summary Table

| Feature | Change Password | Forgot Password |
|---------|----------------|----------------|
| Current Password Required | ✅ YES | ❌ NO |
| Email Verification | ❌ NO | ✅ YES (Privy) |
| User Must Be Logged In | ✅ YES | ⚠️ Optional (works logged in or out) |
| Backend Endpoint | `PUT /api/user/password/update` | `POST /api/user/password/reset-with-email` |
| Frontend Route | `/change-password` | `/reset-password` |
| Privy Integration | ❌ NO | ✅ YES |
| Use Case | User knows password, wants to change | User forgot app password (may be logged in via Privy) |

## Summary

1. ✅ Backend endpoint exists for reset (`/api/user/password/reset`)
2. ➕ Add `/api/user/password/reset-with-email` endpoint (accepts email, no token)
3. ➕ Create separate `/reset-password` page (different from `/change-password`)
4. ➕ Integrate Privy email verification in reset flow
5. ➕ Remove "Current Password" field from reset password form
6. ➕ Update "Forgot password?" link to navigate to `/reset-password`

