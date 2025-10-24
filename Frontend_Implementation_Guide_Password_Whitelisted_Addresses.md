# Frontend Implementation Guide: Password Management & Whitelisted Addresses

## Overview
This guide provides instructions for implementing two new features in the Yappysol frontend:

1. **App Password Management** - For first-time users after Privy authentication
2. **Whitelisted Address Management** - For secure fund withdrawals

## 🗄️ Database Schema Updates Required

### 1. Update `users` table
Add these columns to your existing `users` table:

```sql
ALTER TABLE users 
ADD COLUMN app_password_hash TEXT NULL,
ADD COLUMN app_password_set_at TIMESTAMP WITH TIME ZONE NULL;
```

### 2. Create `whitelisted_addresses` table
```sql
CREATE TABLE whitelisted_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_whitelisted_addresses_user_id ON whitelisted_addresses(user_id);
CREATE INDEX idx_whitelisted_addresses_address ON whitelisted_addresses(address);
CREATE INDEX idx_whitelisted_addresses_active ON whitelisted_addresses(is_active);

-- Trigger for updated_at
CREATE TRIGGER trg_whitelisted_addresses_updated_at 
BEFORE UPDATE ON whitelisted_addresses 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 3. Create `password_reset_tokens` table (Optional - Using In-Memory for Production)
```sql
-- This table is optional since we're using in-memory storage for production
-- Only create if you want persistent token storage
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used ON password_reset_tokens(used);
```

**Note**: For production deployment, we're using an in-memory token store which is simpler and doesn't require additional database tables. Tokens expire after 1 hour and are automatically cleaned up.

## 🔐 Password Management Implementation

### 1. Update Onboarding Flow

**Current Flow:**
```
Privy Auth → Username Setup → Complete
```

**New Flow:**
```
Privy Auth → Username Setup → Password Setup → Complete
```

### 2. Password Setup Component

Create `components/onboarding/PasswordSetup.tsx`:

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface PasswordSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function PasswordSetup({ onComplete, onSkip }: PasswordSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [strength, setStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const validatePassword = async (pwd: string) => {
    try {
      const response = await fetch('/api/user/password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, confirmPassword })
      });
      
      const data = await response.json();
      setErrors(data.errors || []);
      setStrength(data.strength || 'weak');
    } catch (error) {
      console.error('Password validation error:', error);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch('/api/user/password/set', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password, confirmPassword })
      });

      const data = await response.json();

      if (data.success) {
        onComplete();
      } else {
        setErrors([data.error || 'Failed to set password']);
      }
    } catch (error) {
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set Your App Password</CardTitle>
        <CardDescription>
          Create a secure password to protect your account and unlock chat features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {password && (
              <div className="flex items-center gap-2 text-sm">
                <span className={getStrengthColor()}>
                  Password strength: {getStrengthText()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading || errors.length > 0}>
              {isLoading ? 'Setting Password...' : 'Set Password'}
            </Button>
            {onSkip && (
              <Button type="button" variant="outline" onClick={onSkip}>
                Skip
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <h4 className="font-medium mb-2">Password Requirements:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>At least 8 characters long</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Password Verification Component

Create `components/auth/PasswordVerification.tsx`:

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, XCircle } from 'lucide-react';

interface PasswordVerificationProps {
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function PasswordVerification({ 
  onSuccess, 
  onCancel, 
  title = "Enter Your Password",
  description = "Please enter your app password to continue."
}: PasswordVerificationProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/password/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success && data.isValid) {
        onSuccess();
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Password'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

## 🏦 Whitelisted Address Management

### 1. Whitelisted Addresses List Component

Create `components/settings/WhitelistedAddresses.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, Copy, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WhitelistedAddress {
  id: string;
  address: string;
  label?: string;
  is_active: boolean;
  created_at: string;
}

export function WhitelistedAddresses() {
  const [addresses, setAddresses] = useState<WhitelistedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/user/whitelisted-addresses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAddresses(data.addresses);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addAddress = async () => {
    if (!newAddress.trim()) {
      setError('Address is required');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      const response = await fetch('/api/user/whitelisted-addresses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          address: newAddress.trim(), 
          label: newLabel.trim() || undefined 
        })
      });

      const data = await response.json();

      if (data.success) {
        setAddresses([data.address, ...addresses]);
        setNewAddress('');
        setNewLabel('');
        toast.success('Address added successfully');
      } else {
        setError(data.error || 'Failed to add address');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return;

    try {
      const response = await fetch(`/api/user/whitelisted-addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const data = await response.json();

      if (data.success) {
        setAddresses(addresses.filter(addr => addr.id !== id));
        toast.success('Address removed successfully');
      } else {
        toast.error(data.error || 'Failed to remove address');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading addresses...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Whitelisted Withdrawal Addresses</CardTitle>
        <CardDescription>
          Manage addresses where you can withdraw funds from your Yappysol account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Whitelisted Address</DialogTitle>
              <DialogDescription>
                Add a Solana address where you can withdraw funds.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Solana Address</Label>
                <Input
                  id="address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Enter Solana address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label (Optional)</Label>
                <Input
                  id="label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., My Main Wallet"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={addAddress} disabled={isAdding} className="w-full">
                {isAdding ? 'Adding...' : 'Add Address'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {addresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No whitelisted addresses yet. Add one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <Card key={address.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono">
                        {formatAddress(address.address)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyAddress(address.address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {address.label && (
                      <Badge variant="secondary" className="text-xs">
                        {address.label}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAddress(address.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2. Update Onboarding Flow

Update your main onboarding component to include password setup:

```tsx
// In your main onboarding component
import { PasswordSetup } from '@/components/onboarding/PasswordSetup';

const [onboardingStep, setOnboardingStep] = useState<'username' | 'password' | 'complete'>('username');

// After username setup
const handleUsernameComplete = () => {
  setOnboardingStep('password');
};

const handlePasswordComplete = () => {
  setOnboardingStep('complete');
  // Complete onboarding
};

const handlePasswordSkip = () => {
  setOnboardingStep('complete');
  // Complete onboarding without password
};

// In your render method
{onboardingStep === 'username' && (
  <UsernameSetup onComplete={handleUsernameComplete} />
)}

{onboardingStep === 'password' && (
  <PasswordSetup 
    onComplete={handlePasswordComplete}
    onSkip={handlePasswordSkip}
  />
)}

{onboardingStep === 'complete' && (
  <div>Onboarding Complete!</div>
)}
```

### 3. Password Protection for Chat

Add password verification before accessing chat:

```tsx
// In your chat component or route
import { PasswordVerification } from '@/components/auth/PasswordVerification';

const [isPasswordVerified, setIsPasswordVerified] = useState(false);
const [showPasswordModal, setShowPasswordModal] = useState(false);

useEffect(() => {
  checkPasswordStatus();
}, []);

const checkPasswordStatus = async () => {
  try {
    const response = await fetch('/api/user/password/status', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    
    if (data.success && data.hasPassword) {
      setShowPasswordModal(true);
    } else {
      setIsPasswordVerified(true);
    }
  } catch (error) {
    console.error('Failed to check password status:', error);
    setIsPasswordVerified(true);
  }
};

const handlePasswordSuccess = () => {
  setIsPasswordVerified(true);
  setShowPasswordModal(false);
};

// In your render method
if (!isPasswordVerified) {
  return (
    <PasswordVerification
      onSuccess={handlePasswordSuccess}
      onCancel={() => router.push('/settings')}
      title="Unlock Chat"
      description="Enter your app password to access the chat feature."
    />
  );
}

// Your normal chat interface here
```

### 4. Forgot Password Component

Create `components/auth/ForgotPassword.tsx`:

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a password reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              If you don't see the email, check your spam folder or try again.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to="/login">Back to Login</Link>
            </Button>
            <Button variant="outline" onClick={() => setIsSubmitted(false)}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Forgot Password?</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 5. Reset Password Component

Create `components/auth/ResetPassword.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [strength, setStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setIsValidToken(false);
      setIsValidating(false);
      return;
    }

    try {
      const response = await fetch(`/api/user/password/reset/verify/${token}`);
      const data = await response.json();
      
      setIsValidToken(data.success && data.isValid);
    } catch (error) {
      setIsValidToken(false);
    } finally {
      setIsValidating(false);
    }
  };

  const validatePassword = async (pwd: string) => {
    try {
      const response = await fetch('/api/user/password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, confirmPassword })
      });
      
      const data = await response.json();
      setErrors(data.errors || []);
      setStrength(data.strength || 'weak');
    } catch (error) {
      console.error('Password validation error:', error);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors([]);

    try {
      const response = await fetch('/api/user/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password, confirmPassword })
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setErrors([data.error || 'Failed to reset password']);
      }
    } catch (error) {
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  if (isValidating) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Validating reset link...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isValidToken) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Please request a new password reset link.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request New Reset Link</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Password Reset Successfully</CardTitle>
          <CardDescription>
            Your password has been reset. You can now log in with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/login">Continue to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter your new password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {password && (
              <div className="flex items-center gap-2 text-sm">
                <span className={getStrengthColor()}>
                  Password strength: {getStrengthText()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading || errors.length > 0}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <h4 className="font-medium mb-2">Password Requirements:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>At least 8 characters long</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 🔧 API Integration

### Password Management Endpoints

```typescript
// Password API calls
export const passwordAPI = {
  // Set password for first-time users
  setPassword: async (password: string, confirmPassword: string) => {
    const response = await fetch('/api/user/password/set', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ password, confirmPassword })
    });
    return response.json();
  },

  // Verify password
  verifyPassword: async (password: string) => {
    const response = await fetch('/api/user/password/verify', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ password })
    });
    return response.json();
  },

  // Check if user has password set
  getStatus: async () => {
    const response = await fetch('/api/user/password/status', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return response.json();
  },

  // Validate password strength
  validatePassword: async (password: string, confirmPassword?: string) => {
    const response = await fetch('/api/user/password/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirmPassword })
    });
    return response.json();
  },

  // Forgot password - request reset link
  forgotPassword: async (email: string) => {
    const response = await fetch('/api/user/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.json();
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string, confirmPassword: string) => {
    const response = await fetch('/api/user/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, confirmPassword })
    });
    return response.json();
  },

  // Verify reset token
  verifyResetToken: async (token: string) => {
    const response = await fetch(`/api/user/password/reset/verify/${token}`);
    return response.json();
  }
};
```

### Whitelisted Addresses API

```typescript
// Whitelisted addresses API calls
export const whitelistedAddressesAPI = {
  // Get all addresses
  getAddresses: async () => {
    const response = await fetch('/api/user/whitelisted-addresses', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return response.json();
  },

  // Add new address
  addAddress: async (address: string, label?: string) => {
    const response = await fetch('/api/user/whitelisted-addresses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ address, label })
    });
    return response.json();
  },

  // Update address
  updateAddress: async (id: string, updates: { label?: string; isActive?: boolean }) => {
    const response = await fetch(`/api/user/whitelisted-addresses/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  // Delete address
  deleteAddress: async (id: string) => {
    const response = await fetch(`/api/user/whitelisted-addresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return response.json();
  },

  // Check if address is whitelisted
  checkAddress: async (address: string) => {
    const response = await fetch('/api/user/whitelisted-addresses/check', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ address })
    });
    return response.json();
  }
};
```

## 🎨 UI Components Required

Make sure you have these UI components available:

```bash
# Install required dependencies
npm install sonner  # for toast notifications
```

Required components (if not already available):
- `Button`
- `Input`
- `Label`
- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`
- `Alert`, `AlertDescription`
- `Badge`
- `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `DialogTrigger`

## 🔒 Security Considerations

1. **Password Storage**: Passwords are hashed with bcrypt before storage
2. **Token Validation**: All endpoints require valid authentication tokens
3. **Address Validation**: Solana addresses are validated before storage
4. **Rate Limiting**: Consider adding rate limiting to password endpoints
5. **Input Sanitization**: All inputs are validated and sanitized

## 📱 User Experience Flow

### First-Time User Onboarding:
1. User authenticates with Privy
2. User sets username
3. User sets app password (optional but recommended)
4. User completes onboarding

### Chat Access:
1. User tries to access chat
2. If password is set, show password verification modal
3. If no password set, allow direct access
4. After verification, grant chat access

### Settings Management:
1. User can view/manage whitelisted addresses in settings
2. User can update password in settings
3. User can add/remove withdrawal addresses

## 🚀 Implementation Checklist

- [ ] Update database schema (users table + whitelisted_addresses table)
- [ ] Create PasswordSetup component
- [ ] Create PasswordVerification component
- [ ] Create ForgotPassword component
- [ ] Create ResetPassword component
- [ ] Create WhitelistedAddresses component
- [ ] Update onboarding flow to include password step
- [ ] Add password verification to chat access
- [ ] Add settings page for address management
- [ ] Add forgot password link to login page
- [ ] Add password change option in settings
- [ ] Test all API endpoints
- [ ] Test password validation and strength
- [ ] Test address validation and management
- [ ] Test forgot password flow (no email service needed)
- [ ] Test password reset flow
- [ ] Add proper error handling and loading states
- [ ] Add toast notifications for user feedback
- [ ] Deploy to production (in-memory token storage ready)

## 📝 Notes

- Password setup is optional but recommended for security
- Users can skip password setup during onboarding
- Whitelisted addresses are required for fund withdrawals
- All addresses are validated as proper Solana addresses
- Password strength is calculated and displayed in real-time
- Addresses can be labeled for easy identification
- **Production Ready**: Using in-memory token storage for password resets (no email service needed)
- **Privy Integration**: Leverages existing Privy authentication infrastructure
- **Simple Deployment**: No additional email service configuration required
