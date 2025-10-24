# URGENT: Multi-Step Flow Frontend Fix

## Problem
The multi-step flows for **token launch** and **token swap** are not working properly. The backend is correctly detecting intents and returning `step` fields, but the frontend is not handling the multi-step state management.

## Root Cause
The frontend needs to:
1. **Store the `step` field** from backend responses
2. **Pass `currentStep` in context** for subsequent requests
3. **Handle step-based UI states** properly

## Backend Status ✅
- ✅ Intent detection working (`isCreateTokenIntent`, `isSwapIntent`)
- ✅ Multi-step services working (`TokenSwapService`, `TokenCreationService`)
- ✅ Step field being returned in responses
- ✅ Context handling for step continuation

## Required Frontend Changes

### 1. Update Response Processing

**Current Issue:** Frontend is not storing the `step` field from responses.

**Fix:** Update your response processing to capture and store the step:

```typescript
// CURRENT CODE (WRONG)
const data = await response.json();
setMessages(prev => [...prev, {
  id: Date.now(),
  content: data.message,
  role: 'assistant',
  timestamp: new Date()
}]);

// CORRECT CODE (FIXED)
const data = await response.json();
setMessages(prev => [...prev, {
  id: Date.now(),
  content: data.message,
  role: 'assistant',
  timestamp: new Date(),
  step: data.step, // Store the step field
  action: data.action // Store the action field
}]);

// Store current step for next request
if (data.step) {
  setCurrentStep(data.step);
} else {
  setCurrentStep(null); // Clear step when flow completes
}
```

### 2. Update Request Context

**Current Issue:** Frontend is not passing `currentStep` in the context.

**Fix:** Include `currentStep` in the request context:

```typescript
// CURRENT CODE (WRONG)
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    context: {
      walletAddress: walletAddress,
      previousMessages: messageHistory
    },
    sessionId: sessionId
  })
});

// CORRECT CODE (FIXED)
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    context: {
      walletAddress: walletAddress,
      previousMessages: messageHistory,
      currentStep: currentStep // Add this line
    },
    sessionId: sessionId
  })
});
```

### 3. Add State Management

**Add these state variables:**

```typescript
const [currentStep, setCurrentStep] = useState<string | null>(null);
const [currentAction, setCurrentAction] = useState<string | null>(null);
```

### 4. Handle Step-Based UI

**Update UI based on current step:**

```typescript
// Show different UI based on current step
const renderStepBasedUI = () => {
  if (!currentStep) return null;
  
  switch (currentStep) {
    case 'fromToken':
      return <div className="step-indicator">Step 1: Select token to swap from</div>;
    case 'toToken':
      return <div className="step-indicator">Step 2: Select token to swap to</div>;
    case 'amount':
      return <div className="step-indicator">Step 3: Enter amount</div>;
    case 'confirmation':
      return <div className="step-indicator">Step 4: Confirm swap</div>;
    case 'image':
      return <div className="step-indicator">Step 1: Upload token image</div>;
    case 'name':
      return <div className="step-indicator">Step 2: Enter token name</div>;
    case 'symbol':
      return <div className="step-indicator">Step 3: Enter token symbol</div>;
    // Add more steps as needed
    default:
      return null;
  }
};
```

### 5. Handle Action-Based UI

**Show action buttons based on current action:**

```typescript
// Show action buttons based on current action
const renderActionButtons = () => {
  if (currentAction === 'swap') {
    return (
      <div className="action-buttons">
        <button onClick={() => sendMessage('cancel')}>Cancel Swap</button>
        <button onClick={() => sendMessage('back')}>Go Back</button>
      </div>
    );
  }
  
  if (currentAction === 'create-token') {
    return (
      <div className="action-buttons">
        <button onClick={() => sendMessage('cancel')}>Cancel Creation</button>
        <button onClick={() => sendMessage('back')}>Go Back</button>
      </div>
    );
  }
  
  return null;
};
```

### 6. Update Message Sending Function

**Ensure step state is passed:**

```typescript
const sendMessage = async (message: string) => {
  // Add user message
  setMessages(prev => [...prev, {
    id: Date.now(),
    content: message,
    role: 'user',
    timestamp: new Date()
  }]);
  
  // Send to backend with current step
  const response = await fetch('/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      context: {
        walletAddress: walletAddress,
        previousMessages: messageHistory,
        currentStep: currentStep // This is crucial!
      },
      sessionId: sessionId
    })
  });
  
  const data = await response.json();
  
  // Add assistant response
  setMessages(prev => [...prev, {
    id: Date.now(),
    content: data.message,
    role: 'assistant',
    timestamp: new Date(),
    step: data.step,
    action: data.action
  }]);
  
  // Update step state
  if (data.step) {
    setCurrentStep(data.step);
  } else {
    setCurrentStep(null);
  }
  
  if (data.action) {
    setCurrentAction(data.action);
  } else {
    setCurrentAction(null);
  }
};
```

## Expected Backend Response Format

The backend returns responses in this format:

```json
{
  "message": "Which token do you want to swap from?",
  "step": "fromToken",
  "action": "swap",
  "timestamp": "2025-01-24T01:00:00.000Z",
  "context": { ... },
  "sessionId": "session-id"
}
```

## Testing Steps

1. **Test Swap Flow:**
   - Send: "swap token"
   - Should get: `step: "fromToken"`, `action: "swap"`
   - Send: "SOL"
   - Should get: `step: "toToken"`
   - Send: "USDC"
   - Should get: `step: "amount"`
   - Send: "1"
   - Should get: `step: "confirmation"`

2. **Test Launch Flow:**
   - Send: "launch a new token called MyCoin"
   - Should get: `step: "image"`, `action: "create-token"`
   - Send: "skip"
   - Should get: `step: "name"`
   - Send: "MyCoin"
   - Should get: `step: "symbol"`

## Priority
**HIGH PRIORITY** - This is blocking core functionality that was working before the rebrand from Tikka to Yappysol.

## Questions?
If you need clarification on any part of this implementation, please ask. The backend is ready and working - we just need the frontend to properly handle the multi-step state management.
