# Settings Page Username Editing Implementation Guide

## ✅ Backend Changes Made

**Username editing is now available!** The backend has been updated to allow username changes in the settings page.

### Backend API Changes

1. **`PATCH /api/user/profile`** now allows username changes
2. **`GET /api/user/username/check`** now excludes current user from availability check
3. **`UserModel.isUsernameAvailable()`** now supports excluding specific user ID

### API Response Examples

**Username Check (for current user)**:
```json
{
  "available": true,
  "username": "jbgabreal3",
  "message": "This is your current username",
  "isCurrentUser": true
}
```

**Username Check (for new username)**:
```json
{
  "available": true,
  "username": "newusername",
  "message": null
}
```

**Username Update Success**:
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "username": "newusername",
    "onboardingCompleted": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "solBalance": 0
  }
}
```

## 📱 Frontend Implementation

### 1. Username Editing Component

```typescript
import { useState, useEffect } from 'react';

const UsernameEditComponent: React.FC = () => {
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load current username on component mount
  useEffect(() => {
    loadCurrentUsername();
  }, []);

  const loadCurrentUsername = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUsername(data.user.username || '');
        setNewUsername(data.user.username || '');
      }
    } catch (error) {
      console.error('Error loading username:', error);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === currentUsername) {
      setIsAvailable(true);
      setErrorMessage('');
      return;
    }

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
        setErrorMessage(data.message || '');
      } else {
        setIsAvailable(false);
        setErrorMessage('Error checking username availability');
      }
    } catch (error) {
      setIsAvailable(false);
      setErrorMessage('Network error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Debounce the username check
    clearTimeout(usernameCheckTimeout);
    usernameCheckTimeout = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
  };

  const handleSave = async () => {
    if (newUsername === currentUsername) {
      setIsEditing(false);
      return;
    }

    if (!isAvailable) {
      setErrorMessage('Please choose an available username');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          username: newUsername
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUsername(data.user.username);
        setNewUsername(data.user.username);
        setIsEditing(false);
        setSuccessMessage('Username updated successfully!');
        setErrorMessage('');
      } else {
        const error = await response.json();
        setErrorMessage(error.message || 'Failed to update username');
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNewUsername(currentUsername);
    setIsEditing(false);
    setErrorMessage('');
    setSuccessMessage('');
    setIsAvailable(null);
  };

  return (
    <div className="username-settings">
      <h3>Username</h3>
      
      {!isEditing ? (
        <div className="username-display">
          <div className="current-username">
            <span className="username-value">{currentUsername}</span>
            <button 
              onClick={() => setIsEditing(true)}
              className="edit-button"
            >
              Edit
            </button>
          </div>
          {successMessage && (
            <div className="success-message">
              ✅ {successMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="username-edit">
          <div className="input-group">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Enter new username"
              className={`username-input ${isAvailable === false ? 'error' : isAvailable === true ? 'success' : ''}`}
              disabled={isSaving}
            />
            
            {isChecking && (
              <div className="checking-indicator">
                <div className="spinner"></div>
                <span>Checking...</span>
              </div>
            )}
            
            {!isChecking && isAvailable === true && newUsername !== currentUsername && (
              <div className="availability-success">
                ✅ Username available
              </div>
            )}
            
            {!isChecking && isAvailable === false && (
              <div className="availability-error">
                ❌ Username taken
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <div className="edit-actions">
            <button 
              onClick={handleCancel}
              disabled={isSaving}
              className="cancel-button"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !isAvailable || newUsername === currentUsername}
              className="save-button"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="username-info">
        <p>• Username can be changed anytime</p>
        <p>• 3-20 characters long</p>
        <p>• Letters, numbers, hyphens, and underscores only</p>
        <p>• Cannot start or end with hyphens or underscores</p>
      </div>
    </div>
  );
};

// Debounce timeout reference
let usernameCheckTimeout: NodeJS.Timeout;
```

### 2. CSS Styles

```css
.username-settings {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.username-settings h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.username-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-username {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.username-value {
  font-weight: 500;
  color: #333;
  font-size: 16px;
}

.edit-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.edit-button:hover {
  background: #0056b3;
}

.username-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-group {
  position: relative;
}

.username-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
}

.username-input:focus {
  border-color: #007bff;
}

.username-input.success {
  border-color: #28a745;
}

.username-input.error {
  border-color: #dc3545;
}

.checking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.availability-success {
  margin-top: 8px;
  color: #28a745;
  font-size: 14px;
}

.availability-error {
  margin-top: 8px;
  color: #dc3545;
  font-size: 14px;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 8px;
}

.success-message {
  color: #28a745;
  font-size: 14px;
  margin-top: 8px;
}

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button:hover {
  background: #5a6268;
}

.save-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.save-button:hover:not(:disabled) {
  background: #218838;
}

.save-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.username-info {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
}

.username-info p {
  margin: 4px 0;
}
```

### 3. Integration with Settings Page

```typescript
const SettingsPage: React.FC = () => {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      
      <div className="settings-sections">
        {/* Profile Section */}
        <div className="settings-section">
          <h2>Profile</h2>
          <UsernameEditComponent />
        </div>

        {/* Other settings sections */}
        <div className="settings-section">
          <h2>Security</h2>
          {/* Password settings */}
        </div>

        <div className="settings-section">
          <h2>Privacy</h2>
          {/* Privacy settings */}
        </div>
      </div>
    </div>
  );
};
```

## 🎯 Key Features

1. **✅ Username Editing**: Users can change their username anytime
2. **✅ Real-time Validation**: Checks availability as user types
3. **✅ Debounced API Calls**: Prevents excessive requests
4. **✅ Error Handling**: Clear error messages for all scenarios
5. **✅ Success Feedback**: Confirmation when username is updated
6. **✅ Cancel Option**: Users can cancel changes
7. **✅ Current Username Display**: Shows current username when not editing

## 📋 Implementation Checklist

- [ ] **Add username editing component** to settings page
- [ ] **Implement debounced username checking**
- [ ] **Add proper error handling** for all scenarios
- [ ] **Style the component** with provided CSS
- [ ] **Test username changes** with different scenarios
- [ ] **Handle edge cases** (same username, network errors, etc.)

## 🚀 Benefits

1. **🎯 User Control**: Users can change their username anytime
2. **⚡ Real-time Feedback**: Immediate availability checking
3. **🔒 Secure**: Proper validation and error handling
4. **📱 Great UX**: Smooth editing experience with clear feedback
5. **🛡️ Robust**: Handles all edge cases gracefully

This implementation provides a complete username editing experience in the settings page!

