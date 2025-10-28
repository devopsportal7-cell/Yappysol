import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ChatService } from '../services/ChatService';
import { TokenCreationService } from '../services/TokenCreationService';
import { TokenSwapService } from '../services/TokenSwapService';
import { ChatSessionModel } from '../models/ChatSessionSupabase';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Main chat endpoint with n8n integration
router.post('/message', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /message endpoint called');
  console.log('[CHAT] Request body:', req.body);
  console.log('[CHAT] User ID:', req.user?.id);
  
  const userId = req.user?.id;
  if (!userId) {
    console.log('[CHAT] No user ID, returning 401');
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { message, context, sessionId } = req.body;
  console.log('[CHAT] Message:', message);
  console.log('[CHAT] Context:', context);
  console.log('[CHAT] Session ID:', sessionId);
  
  // Use direct backend processing (n8n integration disabled)
  console.log('[CHAT] Using direct backend processing');
  
  try {
    // Save user message to session if sessionId provided
    let currentSessionId = sessionId;
    
    // Add wallet address to context if available
    const enhancedContext = {
      ...context,
      userId,
      walletAddress: context.walletAddress || context.wallet?.publicKey
    };
    
    // Recover flowType from session if we have a currentStep but no flowType
    if (enhancedContext.currentStep && !enhancedContext.flowType && currentSessionId) {
      try {
        const session = await ChatSessionModel.findById(currentSessionId);
        if (session && session.messages.length > 0) {
          // Find the last AI message that had a flowType
          const lastAiMessageWithFlow = session.messages
            .filter((msg: any) => msg.role === 'assistant' && msg.flowType)
            .pop();
          if (lastAiMessageWithFlow) {
            enhancedContext.flowType = lastAiMessageWithFlow.flowType;
            console.log(`[CHAT] ✅ Recovered flowType '${enhancedContext.flowType}' from session`);
          }
        }
      } catch (error) {
        console.error('[CHAT] Error recovering flowType from session:', error);
      }
    }
    
    console.log('[CHAT] Enhanced context:', enhancedContext);
    if (currentSessionId) {
      try {
        const userMessage = {
          id: `msg-${Date.now()}-user`,
          content: message,
          role: 'user',
          created_at: new Date().toISOString()
        };
        await ChatSessionModel.addMessage(currentSessionId, userMessage);
        console.log('[CHAT] Saved user message to session:', currentSessionId);
      } catch (error) {
        console.error('[CHAT] Failed to save user message to session:', error);
        // Create a new session if the current one doesn't exist
        try {
          const newSession = await ChatSessionModel.createSession({
            userId,
            title: 'New Chat'
          });
          currentSessionId = newSession.id;
          console.log('[CHAT] Created new session:', currentSessionId);
          
          // Try to add the message again
          const userMessage = {
            id: `msg-${Date.now()}-user`,
            content: message,
            role: 'user',
            created_at: new Date().toISOString()
          };
          await ChatSessionModel.addMessage(currentSessionId, userMessage);
          console.log('[CHAT] Saved user message to new session:', currentSessionId);
        } catch (createError) {
          console.error('[CHAT] Failed to create new session:', createError);
          // Continue without session tracking
          currentSessionId = null;
        }
      }
    }
    
    let response: any;
    
    // Check if we're in a step flow - this takes priority over intent detection
    if (enhancedContext.currentStep) {
      console.log('[CHAT] Continuing step flow:', enhancedContext.currentStep);
      
      // Determine which service to route to based on the step AND flowType
      // Check for swap-specific steps first
      if (enhancedContext.currentStep === 'fromToken' || enhancedContext.currentStep === 'toToken') {
        console.log('[CHAT] Routing to: swap service (step continuation)');
        const swapService = new TokenSwapService();
        response = await swapService.handleSwapIntent(message, enhancedContext);
        if (response) {
          response.action = 'swap';
        }
      }
      // Check for token creation-specific steps
      else if (enhancedContext.currentStep === 'image' || enhancedContext.currentStep === 'name' || 
               enhancedContext.currentStep === 'symbol' || enhancedContext.currentStep === 'description' ||
               enhancedContext.currentStep === 'twitter' || enhancedContext.currentStep === 'telegram' ||
               enhancedContext.currentStep === 'website' || enhancedContext.currentStep === 'pool') {
        console.log('[CHAT] Routing to: token creation service (step continuation)');
        const tokenCreationService = new TokenCreationService();
        response = await tokenCreationService.handleCreationIntent(message, enhancedContext);
        if (response) {
          response.action = 'create-token';
        }
      }
      // Handle shared steps (amount, confirmation) based on flowType
      else if (enhancedContext.currentStep === 'amount' || enhancedContext.currentStep === 'confirmation') {
        console.log('[CHAT] 🔍 SHARED STEP DEBUG - Current step:', enhancedContext.currentStep);
        console.log('[CHAT] 🔍 SHARED STEP DEBUG - flowType:', enhancedContext.flowType);
        console.log('[CHAT] 🔍 SHARED STEP DEBUG - fromToken:', enhancedContext.fromToken);
        console.log('[CHAT] 🔍 SHARED STEP DEBUG - toToken:', enhancedContext.toToken);
        
        // Check if we have flow context to determine which service to use
        if (enhancedContext.flowType === 'swap' || enhancedContext.fromToken || enhancedContext.toToken) {
          console.log('[CHAT] Routing to: swap service (shared step - swap context)');
          const swapService = new TokenSwapService();
          response = await swapService.handleSwapIntent(message, enhancedContext);
          if (response) {
            response.action = 'swap';
          }
        } else if (enhancedContext.flowType === 'token-creation' || enhancedContext.tokenName || enhancedContext.tokenSymbol) {
          console.log('[CHAT] Routing to: token creation service (shared step - creation context)');
          const tokenCreationService = new TokenCreationService();
          response = await tokenCreationService.handleCreationIntent(message, enhancedContext);
          if (response) {
            response.action = 'create-token';
          }
        } else {
          // No clear context, try to determine from the original message
          console.log('[CHAT] No clear flow context for shared step, falling back to intent detection');
          const chatService = new ChatService();
          response = await chatService.chatWithOpenAI(message, enhancedContext);
        }
      } else {
        // Unknown step, fall back to general chat
        console.log('[CHAT] Unknown step, falling back to general chat');
        const chatService = new ChatService();
        response = await chatService.chatWithOpenAI(message, enhancedContext);
      }
    } else {
      // No current step, do intent detection
      console.log('[CHAT] No current step, doing intent detection');
      const chatService = new ChatService();
      response = await chatService.chatWithOpenAI(message, enhancedContext);
    }
    
    // Ensure we have a response
    if (!response) {
      response = {
        prompt: 'Sorry, I encountered an error processing your request. Please try again.',
        action: 'error'
      };
    }
    
    console.log('[CHAT] Service response:', response);
    
    // Save assistant response to session if sessionId provided
    if (currentSessionId) {
      try {
        const assistantMessage = {
          id: `msg-${Date.now()}-assistant`,
          content: response.prompt || (response as any).message || 'No response',
          role: 'assistant',
          action: response.action,
          step: response.step,
          flowType: response.flowType,
          created_at: new Date().toISOString()
        };
        await ChatSessionModel.addMessage(currentSessionId, assistantMessage);
        console.log('[CHAT] Saved assistant message to session:', currentSessionId);
      } catch (error) {
        console.error('[CHAT] Failed to save assistant message to session:', error);
        // Continue without session tracking
      }
    }
    
    // Return response in the format the frontend expects
    const finalResponse = {
      ...response,
      message: response.prompt || (response as any).message,
      timestamp: new Date().toISOString(),
      context: enhancedContext,
      sessionId: currentSessionId
    };
    
    console.log('[CHAT] Final response:', finalResponse);
    res.json(finalResponse);
    
  } catch (error) {
    console.error('[CHAT] Error processing message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      prompt: 'Sorry, I encountered an error processing your request. Please try again.',
      action: 'error',
      timestamp: new Date().toISOString()
    });
  }
}));

// Token creation endpoint for handling image uploads and step flow
router.post('/token-creation', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  console.log('[CHAT] /token-creation endpoint called');
  console.log('[CHAT] File:', req.file ? 'File received' : 'No file');
  console.log('[CHAT] Body:', req.body);
  
    // Get userId from authenticated user or request body
    const userId = req.user?.id || req.body.userId;
    if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }

    if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      prompt: 'Please upload an image file for your token.',
      step: 'image'
    });
  }

  try {
    const tokenCreationService = new TokenCreationService();
    
    // Use the specific image upload handler
    const result = await tokenCreationService.handleImageUpload(req.file, { userId });
    
    console.log('[CHAT] Token creation result:', result);
    res.json(result);
    
  } catch (error) {
    console.error('[CHAT] Error in token creation:', error);
    res.status(500).json({ 
      error: 'Failed to process token creation',
      prompt: 'Sorry, I encountered an error processing your image. Please try again.',
      step: 'image'
    });
  }
}));

// Session management endpoints
// Get all chat sessions for a user
router.get('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /sessions GET endpoint called');
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const sessions = await ChatSessionModel.findByUserId(userId);
    console.log('[CHAT] Found sessions:', sessions.length);
    res.json({ sessions });
  } catch (error) {
    console.error('[CHAT] Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
}));

// Create a new chat session
router.post('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /sessions POST endpoint called');
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const { title } = req.body;
    const session = await ChatSessionModel.createSession({
      userId,
      title: title || 'New Chat'
    });
    console.log('[CHAT] Created session:', session.id);
    res.json({ session });
  } catch (error) {
    console.error('[CHAT] Error creating session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
}));

// Get a specific chat session
router.get('/sessions/:id', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /sessions/:id GET endpoint called');
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const session = await ChatSessionModel.findById(req.params.id);
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    console.log('[CHAT] Found session:', session.id);
    res.json({ session });
  } catch (error) {
    console.error('[CHAT] Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
}));

// Update a chat session
router.put('/sessions/:id', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /sessions/:id PUT endpoint called');
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const { messages, customTitle } = req.body;
    const session = await ChatSessionModel.updateSession(req.params.id, {
      messages,
      customTitle
    });
    
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log('[CHAT] Updated session:', session.id);
    res.json({ session });
  } catch (error) {
    console.error('[CHAT] Error updating session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
}));

// Add a message to a chat session
router.post('/sessions/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /sessions/:id/messages POST endpoint called');
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const { content, role, attachments, action } = req.body;
    const message = {
      id: `msg-${Date.now()}-${role}`,
      content,
      role,
      attachments,
      action,
      created_at: new Date().toISOString()
    };

    const session = await ChatSessionModel.addMessage(req.params.id, message);
    
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log('[CHAT] Added message to session:', session.id);
    res.json({ session });
  } catch (error) {
    console.error('[CHAT] Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message to session' });
  }
}));

// Delete a chat session
router.delete('/sessions/:id', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[CHAT] /sessions/:id DELETE endpoint called');
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // First check if session exists and belongs to user
    const session = await ChatSessionModel.findById(req.params.id);
    if (!session || session.user_id !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await ChatSessionModel.deleteSession(req.params.id);
    console.log('[CHAT] Deleted session:', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[CHAT] Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
}));

export default router; 