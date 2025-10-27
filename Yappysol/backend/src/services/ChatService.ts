import axios from 'axios';
import OpenAI from 'openai';
import { TokenPriceService } from './TokenPriceService';
import { UserPortfolioService } from './UserPortfolioService';
import { TokenSwapService } from './TokenSwapService';
import { TokenCreationService } from './TokenCreationService';
import { TrendingService } from './TrendingService';
import { IntentClassifier } from './IntentClassifier';
import { EntityExtractor } from './EntityExtractor';
import { RAGService } from './RAGService';
import { ChatSessionModel } from '../models/ChatSessionSupabase';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export class ChatService {
  public tokenPriceService: TokenPriceService;
  private userPortfolioService: UserPortfolioService;
  private tokenSwapService: TokenSwapService;
  private tokenCreationService: TokenCreationService;
  private trendingService: TrendingService;
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private ragService: RAGService;

  constructor() {
    this.tokenPriceService = new TokenPriceService();
    this.userPortfolioService = new UserPortfolioService();
    this.tokenSwapService = new TokenSwapService();
    this.tokenCreationService = new TokenCreationService();
    this.trendingService = new TrendingService();
    this.intentClassifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.ragService = new RAGService();
  }

  public isPriceQuery(message: string): boolean {
    const priceKeywords = [
      'price',
      'cost',
      'value',
      'worth',
      'how much',
      'current price',
      'latest price',
      'token price',
      'price of',
    ];
    const lowerMessage = message.toLowerCase();
    const result = priceKeywords.some(keyword => lowerMessage.includes(keyword));
    console.log('[isPriceQuery]', { message, result });
    return result;
  }

  private isPortfolioQuery(message: string): boolean {
    const portfolioKeywords = [
      'portfolio',
      'my tokens',
      'my coins',
      'what do i own',
      'show my tokens',
      'show my portfolio',
      'wallet tokens',
      'wallet coins',
      'my assets',
      'list my tokens',
      'list my coins',
      'get portfolio',
      'portfolio performance',
      'my portfolio performance',
      'profile tokens',
      'my profile tokens',
      'portfolio summary',
      'portfolio value',
      'portfolio balance',
      'portfolio overview',
      'token holdings',
      'show holdings',
      'get my tokens',
      'get my portfolio',
      'display my portfolio',
      'display my tokens',
      'portfolio report',
      'wallet performance',
      'wallet summary',
      'wallet value',
      'my balance',
      'what is my balance',
      'balance',
      'show balance',
      'wallet balance',
      'account balance',
      'solana balance',
      'sol balance',
      'how much do i have',
      'how much sol do i have',
      'how much is in my wallet',
      'how much money do i have',
      'how much crypto do i have',
      'how much are my tokens worth',
      'how much are my coins worth',
    ];
    const lowerMessage = message.toLowerCase();
    const result = portfolioKeywords.some(keyword => lowerMessage.includes(keyword));
    console.log('[isPortfolioQuery]', { message, result });
    return result;
  }

  private isBotCapabilityQuery(message: string): boolean {
    const triggers = [
      "what can you do",
      "how can you help",
      "what are your features",
      "what can you do for me",
      "how do i use you",
      "what is this",
      "who are you",
      "what can this bot do",
      "what can this assistant do",
      "what can solchatta do",
      "help me",
      "your capabilities",
      "your features"
    ];
    const lower = message.toLowerCase();
    return triggers.some(trigger => lower.includes(trigger));
  }

  private isTrendingQuery(message: string): boolean {
    const trendingKeywords = [
      'trending',
      "what's new",
      'what is new',
      'what is trending',
      'top tokens',
      'top projects',
      'top protocols',
      'top coins',
      'top solana',
      'best tokens',
      'best projects',
      'best protocols',
      'best coins',
      'what is hot',
      'what is popular',
      'what is moving',
      'what is pumping',
      'what is active',
      'what is up',
      'what is happening',
      'what is going on',
      'what is new on solana',
      'what is new in solana',
      'what is new in defi',
      'what is new in crypto',
      'what is new in tokens',
      'what is new in coins',
    ];
    const lowerMessage = message.toLowerCase();
    return trendingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isSwapIntent(message: string): boolean {
    const swapKeywords = [
      'swap',
      'exchange',
      'trade',
      'convert',
      'swap token',
      'swap tokens',
      'exchange token',
      'exchange tokens',
      'trade token',
      'trade tokens',
      'convert token',
      'convert tokens'
    ];

    const lowerMessage = message.toLowerCase();
    return swapKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isCreateTokenIntent(message: string): boolean {
    const createKeywords = [
      'create token',
      'create tokens',
      'launch token',
      'launch tokens',
      'mint token',
      'mint tokens',
      'deploy token',
      'deploy tokens',
      'new token',
      'new tokens',
      'token creation',
      'token launch',
      'token mint',
      'token deploy'
    ];

    const lowerMessage = message.toLowerCase();
    return createKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isGeneralTradingQuestion(message: string): boolean {
    const tradingKeywords = [
      'should i buy',
      'should i sell',
      'is it a good time',
      'what do you think about',
      'analysis of',
      'opinion on',
      'advice on',
      'recommend',
      'suggest',
      'best tokens',
      'good investment',
      'bad investment',
      'risky',
      'safe',
      'market outlook',
      'price prediction',
      'when to buy',
      'when to sell',
      'hodl',
      'diamond hands',
      'paper hands',
      'fomo',
      'fud',
      'bullish',
      'bearish',
      'pump',
      'dump',
      'moon',
      'rug pull',
      'scam',
      'legit',
      'trustworthy',
      'reliable'
    ];

    const lowerMessage = message.toLowerCase();
    return tradingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isMarketAnalysisQuestion(message: string): boolean {
    const analysisKeywords = [
      'market analysis',
      'technical analysis',
      'fundamental analysis',
      'tokenomics',
      'utility',
      'use case',
      'adoption',
      'partnerships',
      'team',
      'roadmap',
      'whitepaper',
      'audit',
      'security',
      'liquidity',
      'volume',
      'market cap',
      'circulating supply',
      'total supply',
      'burn',
      'mint',
      'inflation',
      'deflation',
      'staking',
      'governance',
      'voting',
      'dao',
      'defi',
      'yield farming',
      'liquidity mining',
      'apy',
      'apr'
    ];

    const lowerMessage = message.toLowerCase();
    return analysisKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isGeneralChat(message: string): boolean {
    const generalKeywords = [
      'hello',
      'hi',
      'hey',
      'how are you',
      'what\'s up',
      'how\'s it going',
      'thanks',
      'thank you',
      'help',
      'explain',
      'what is',
      'how does',
      'why',
      'when',
      'where',
      'tell me about',
      'i want to know',
      'i don\'t understand',
      'can you help',
      'i need help',
      'confused',
      'new to',
      'beginner',
      'learning',
      'teach me',
      'guide me'
    ];

    const lowerMessage = message.toLowerCase();
    return generalKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isGeneralQuestion(message: string): boolean {
    const questionKeywords = [
      'what is',
      'how does',
      'why',
      'when',
      'where',
      'tell me about',
      'explain',
      'can you explain',
      'i want to know',
      'i don\'t understand',
      'what does',
      'how do i',
      'how can i',
      'what are',
      'how are',
      'what should',
      'how should',
      'what would',
      'how would',
      'difference between',
      'compare',
      'vs',
      'versus',
      'better than',
      'best',
      'worst',
      'pros and cons',
      'advantages',
      'disadvantages',
      'benefits',
      'risks',
      'safe',
      'secure',
      'reliable',
      'trustworthy',
      'legitimate',
      'scam',
      'fraud',
      'fake',
      'real',
      'official',
      'unofficial'
    ];

    const lowerMessage = message.toLowerCase();
    return questionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async getMarketContext(): Promise<string> {
    try {
      // Get trending tokens for market context
      const trendingTokens = await this.trendingService.getTrending(5);
      let context = '';
      
      if (trendingTokens && trendingTokens.length > 0) {
        context += '📊 **Current Market Context:**\n';
        context += `- Top trending: ${trendingTokens.slice(0, 3).map((t: any) => t.symbol || 'Unknown').join(', ')}\n`;
        context += `- Market activity: High volume and interest in trending tokens\n\n`;
      }
      
      return context;
    } catch (error) {
      console.error('Error getting market context:', error);
      return '';
    }
  }

  private formatTrendingTokens(tokens: any[]): string {
    if (!tokens || tokens.length === 0) {
      return 'No trending tokens found at the moment.';
    }

    let prompt = '🔥 **Top Trending Tokens on Solana**\n\n';
    
    tokens.forEach((token, index) => {
      const price = token.priceUsd ? `$${parseFloat(token.priceUsd).toFixed(6)}` : 'N/A';
      const change24h = token.priceChange?.h24 ? `${parseFloat(token.priceChange.h24).toFixed(2)}%` : 'N/A';
      const volume24h = token.volume?.h24 ? `$${(parseFloat(token.volume.h24) / 1000000).toFixed(2)}M` : 'N/A';
      
      prompt += `${index + 1}. **${token.baseToken?.symbol || 'Unknown'}**\n`;
      prompt += `   Price: ${price}\n`;
      prompt += `   24h Change: ${change24h}\n`;
      prompt += `   24h Volume: ${volume24h}\n`;
      prompt += `   Address: \`${token.baseToken?.address || 'N/A'}\`\n\n`;
    });

    return prompt;
  }

  private async generateConversationalTrendingResponse(tokens: any[], message: string): Promise<string> {
    if (!openai) {
      return this.formatTrendingTokens(tokens);
    }

    try {
      // Prepare structured data for OpenAI
      const tokenData = tokens.map((token, index) => ({
        rank: index + 1,
        symbol: token.symbol || 'Unknown',
        name: token.name || 'Unknown',
        price: token.priceUsd || 'N/A',
        change24h: token.priceChange?.h24 || 'N/A',
        volume24h: token.volume?.h24 || 'N/A',
        address: token.address || 'N/A',
        imageUrl: token.imageUrl || null,
        solscanUrl: token.solscanUrl || null
      }));

      const systemPrompt = `You are Yappysol, a helpful and enthusiastic Solana DeFi assistant. The user asked about trending tokens.

IMPORTANT RULES:
1. Be conversational and engaging with Yappysol's personality
2. Use emojis appropriately but not excessively
3. Highlight interesting trends and movements
4. Keep it concise but informative
5. Always include the structured data at the end for the frontend

Here's the trending token data:
${JSON.stringify(tokenData, null, 2)}

Format your response as:
1. Engaging conversational intro
2. Brief analysis of trends
3. Key highlights
4. Then include: "📊 **Detailed Data:**" followed by the structured format

Be enthusiastic about the Solana ecosystem!`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const conversationalResponse = completion.choices[0].message.content || this.formatTrendingTokens(tokens);
      
      // Append structured data for frontend
      const structuredData = '\n\n📊 **Detailed Data:**\n' + this.formatTrendingTokens(tokens);
      
      return conversationalResponse + structuredData;

    } catch (error) {
      console.error('[ChatService] Error generating conversational trending response:', error);
      return this.formatTrendingTokens(tokens);
    }
  }

  async chatWithOpenAI(message: string, context: any = {}) {
    try {
      console.log('[chatWithOpenAI] Received message:', message);
      console.log('[chatWithOpenAI] Context:', context);
      console.log('[chatWithOpenAI] context.currentStep:', context.currentStep);
      console.log('[chatWithOpenAI] typeof context.currentStep:', typeof context.currentStep);
      console.log('[chatWithOpenAI] context.currentStep truthy:', !!context.currentStep);
    
      // Attempt to recover flowType from session if not present in context but currentStep is
      if (!context.flowType && context.currentStep && context.sessionId) {
        console.log('[chatWithOpenAI] Attempting flowType recovery from session:', context.sessionId);
        try {
          const chatSession = await ChatSessionModel.findById(context.sessionId);
          if (chatSession && chatSession.messages.length > 0) {
            console.log('[chatWithOpenAI] Session found with', chatSession.messages.length, 'messages');
            // Find the last AI message that had a flowType
            const lastAiMessageWithFlow = chatSession.messages
              .filter((msg: any) => msg.role === 'assistant' && msg.flowType)
              .pop();
            if (lastAiMessageWithFlow) {
              context.flowType = lastAiMessageWithFlow.flowType;
              console.log(`[chatWithOpenAI] ✅ Successfully recovered flowType '${context.flowType}' from session for step continuation.`);
            } else {
              console.log('[chatWithOpenAI] ❌ No AI message with flowType found in session');
            }
          } else {
            console.log('[chatWithOpenAI] ❌ Session not found or empty');
          }
        } catch (error) {
          console.error('[chatWithOpenAI] Error recovering flowType from session:', error);
          // Continue without flowType recovery
        }
      } else if (!context.flowType && context.currentStep) {
        console.log('[chatWithOpenAI] ⚠️ Step continuation without sessionId - cannot recover flowType');
      }
      
      // Validate context for step continuation
      if (context.currentStep && !context.flowType) {
        console.warn('[chatWithOpenAI] Step continuation without flowType - attempting to infer from step pattern');
        
        // Try to infer flowType from step pattern as last resort
        if (context.currentStep === 'fromToken' || context.currentStep === 'toToken') {
          context.flowType = 'swap';
          console.log('[chatWithOpenAI] 🔍 Inferred flowType as "swap" from step:', context.currentStep);
        } else if (context.currentStep === 'tokenName' || context.currentStep === 'tokenSymbol' || context.currentStep === 'description') {
          context.flowType = 'token-creation';
          console.log('[chatWithOpenAI] 🔍 Inferred flowType as "token-creation" from step:', context.currentStep);
        } else {
          console.warn('[chatWithOpenAI] ⚠️ Cannot infer flowType from step:', context.currentStep);
        }
      }
    
      // Check if we're in a step flow - this takes priority over intent detection
      if (context.currentStep && context.currentStep !== null && context.currentStep !== undefined) {
        console.log('[chatWithOpenAI] Continuing step flow:', context.currentStep);
        console.log('[chatWithOpenAI] Step flow context:', JSON.stringify(context, null, 2));
        
        // Re-extract entities from the current message to enhance context
        try {
          console.log('[chatWithOpenAI] Re-extracting entities for step continuation...');
          const reExtractedEntities = await this.entityExtractor.extractEntities(message, 'swap');
          console.log('[chatWithOpenAI] Re-extracted entities:', reExtractedEntities);
          
          // Merge re-extracted entities into context (don't overwrite existing ones)
          Object.keys(reExtractedEntities).forEach(key => {
            if (reExtractedEntities[key] && !context[key]) {
              context[key] = reExtractedEntities[key];
              console.log(`[chatWithOpenAI] Added ${key}: ${reExtractedEntities[key]} to context`);
            }
          });
        } catch (error) {
          console.error('[chatWithOpenAI] Error re-extracting entities:', error);
          // Continue without re-extraction
        }
        
        // Determine which service to route to based on the step AND flow type
        // Check for swap flow first (more specific steps)
        if (context.currentStep === 'fromToken' || context.currentStep === 'toToken') {
          console.log('[chatWithOpenAI] Routing to: swap service (step continuation)');
          try {
            const swapResult = await this.tokenSwapService.handleSwapIntent(message, context);
            return {
              prompt: swapResult.prompt,
              step: swapResult.step,
              action: 'swap',
              flowType: 'swap',
              unsignedTransaction: swapResult.unsignedTransaction,
              requireSignature: swapResult.requireSignature,
              swapDetails: swapResult.swapDetails
            };
          } catch (error) {
            console.error('[chatWithOpenAI] Error in swap step continuation:', error);
            return { prompt: 'Sorry, I encountered an error processing your swap request. Please try again.', step: null };
          }
        }
        
        // Check for token creation steps (more specific steps first)
        if (context.currentStep === 'image' || context.currentStep === 'name' || 
            context.currentStep === 'symbol' || context.currentStep === 'description' ||
            context.currentStep === 'twitter' || context.currentStep === 'telegram' ||
            context.currentStep === 'website' || context.currentStep === 'pool') {
          console.log('[chatWithOpenAI] Routing to: token creation service (step continuation)');
          try {
            const creationResult = await this.tokenCreationService.handleCreationIntent(message, context);
            if (!creationResult) {
              return { prompt: 'Token creation process interrupted. Please start over.', step: null };
            }
            return {
              prompt: creationResult.prompt,
              step: creationResult.step,
              action: 'create-token',
              flowType: 'token-creation',
              unsignedTransaction: creationResult.unsignedTransaction,
              requireSignature: creationResult.requireSignature,
              tokenDetails: (creationResult as any).tokenDetails
            };
          } catch (error) {
            console.error('[chatWithOpenAI] Error in token creation step continuation:', error);
            return { prompt: 'Sorry, I encountered an error processing your token creation request. Please try again.', step: null };
          }
        }
        
        // Handle shared steps (amount, confirmation) based on flow context
        if (context.currentStep === 'amount' || context.currentStep === 'confirmation') {
          console.log('[chatWithOpenAI] 🔍 SHARED STEP DEBUG - Current step:', context.currentStep);
          console.log('[chatWithOpenAI] 🔍 SHARED STEP DEBUG - flowType:', context.flowType);
          console.log('[chatWithOpenAI] 🔍 SHARED STEP DEBUG - fromToken:', context.fromToken);
          console.log('[chatWithOpenAI] 🔍 SHARED STEP DEBUG - toToken:', context.toToken);
          console.log('[chatWithOpenAI] 🔍 SHARED STEP DEBUG - tokenName:', context.tokenName);
          console.log('[chatWithOpenAI] 🔍 SHARED STEP DEBUG - tokenSymbol:', context.tokenSymbol);
          
          // Check if we have flow context to determine which service to use
          // PRIORITY: Explicit flowType first, then context clues
          if (context.flowType === 'swap' || (context.fromToken || context.toToken)) {
            console.log('[chatWithOpenAI] Routing to: swap service (shared step - swap context)');
            try {
              const swapResult = await this.tokenSwapService.handleSwapIntent(message, context);
              return {
                prompt: swapResult.prompt,
                step: swapResult.step,
              action: 'swap',
              flowType: 'swap',
              unsignedTransaction: swapResult.unsignedTransaction,
                requireSignature: swapResult.requireSignature,
                swapDetails: swapResult.swapDetails
              };
            } catch (error) {
              console.error('[chatWithOpenAI] Error in swap step continuation:', error);
              return { prompt: 'Sorry, I encountered an error processing your swap request. Please try again.', step: null };
            }
          } else if (context.flowType === 'token-creation' || context.tokenName || context.tokenSymbol) {
            console.log('[chatWithOpenAI] Routing to: token creation service (shared step - creation context)');
            try {
              const creationResult = await this.tokenCreationService.handleCreationIntent(message, context);
              if (!creationResult) {
                return { prompt: 'Token creation process interrupted. Please start over.', step: null };
              }
              return {
                prompt: creationResult.prompt,
                step: creationResult.step,
                action: 'create-token',
                unsignedTransaction: creationResult.unsignedTransaction,
                requireSignature: creationResult.requireSignature,
                tokenDetails: (creationResult as any).tokenDetails
              };
            } catch (error) {
              console.error('[chatWithOpenAI] Error in token creation step continuation:', error);
              return { prompt: 'Sorry, I encountered an error processing your token creation request. Please try again.', step: null };
            }
          } else {
            // No clear context, try to determine from the original message
            console.log('[chatWithOpenAI] No clear flow context for shared step, falling back to intent detection');
            console.warn('[chatWithOpenAI] Step continuation without recognized flowType - this may cause routing issues');
            // Fall through to intent detection below
          }
        }
    }
    
    // === INTELLIGENT INTENT CLASSIFICATION ===
    // Use AI-powered classification to understand natural language
    console.log('[chatWithOpenAI] Starting intelligent intent classification...');
    try {
      const intentResult = await this.intentClassifier.classifyIntent(message);
      console.log('[chatWithOpenAI] Intent classification result:', intentResult);

      // If AI classification is confident, use it to route intelligently
      if (intentResult.confidence >= 0.8) { // Higher threshold for more reliable routing
        console.log('[chatWithOpenAI] Using AI-classified intent:', intentResult.intent);
        console.log('[chatWithOpenAI] Is actionable:', intentResult.isActionable);
        
        // If it's not actionable (question), route to RAG instead
        if (!intentResult.isActionable) {
          console.log('[chatWithOpenAI] Non-actionable intent, routing to RAG');
          try {
            const entities = intentResult.entities && Object.keys(intentResult.entities).length > 0
              ? intentResult.entities
              : await this.entityExtractor.extractEntities(message, intentResult.intent);
            
            const ragResult = await this.ragService.answerQuestion(message, entities, context);
            
            if (ragResult.source === 'knowledge_base' && ragResult.confidence > 0.6) {
              return { 
                prompt: ragResult.answer,
                action: 'rag_answer',
                sources: ragResult.sources,
                metadata: ragResult.metadata
              };
            } else {
              return { 
                prompt: ragResult.answer,
                action: 'general_answer',
                metadata: ragResult.metadata
              };
            }
          } catch (error) {
            console.error('[chatWithOpenAI] RAG failed for non-actionable intent:', error);
            // Fall through to regular processing
          }
        }
        
        // Extract additional entities if needed
        const entities = intentResult.entities && Object.keys(intentResult.entities).length > 0
          ? intentResult.entities
          : await this.entityExtractor.extractEntities(message, intentResult.intent);
        
        console.log('[chatWithOpenAI] Extracted entities:', entities);

        // Route based on AI-classified intent (only for actionable intents)
        switch (intentResult.intent) {
          case 'swap': {
            console.log('[chatWithOpenAI] AI-routed to: swap service');
            
            // Check if this is a tutorial/help request
            const lowerMessage = message.toLowerCase();
            const isTutorialQuery = lowerMessage.includes('how do i') || 
                                   lowerMessage.includes('how can i') || 
                                   lowerMessage.includes('how to') ||
                                   lowerMessage.includes('can you swap') ||
                                   lowerMessage.includes('show me how');
            
            if (isTutorialQuery) {
              console.log('[chatWithOpenAI] Detected swap tutorial query, showing guided tutorial');
              
              // Provide a guided tutorial on how to swap
              const tutorialPrompt = `🔄 **How to Swap Tokens in This Chat**

I can help you swap tokens directly here in the chat! Here's how:

**Step 1: Tell me what you want to swap**
Just say something like:
- "swap 1 SOL for USDC"
- "trade 100 USDC for BONK"
- "I want to swap SOL to USDT"

**Step 2: I'll guide you through the process**
I'll ask you to confirm the details and then prepare the transaction.

**Step 3: Sign the transaction**
When ready, you'll sign the transaction with your wallet to complete the swap.

---

**Try it now!** Simply tell me what tokens you'd like to swap. For example:
- "swap 0.5 SOL for USDC"
- "I want to trade my USDT for BONK"
- "swap SOL to WIF"`;

              return {
                prompt: tutorialPrompt,
                action: 'swap-tutorial'
              };
            }
            
            // Regular swap intent - enhance context with extracted entities
            const enhancedContext = { ...context, ...entities };
            try {
              const swapResult = await this.tokenSwapService.handleSwapIntent(message, enhancedContext);
              return {
                prompt: swapResult.prompt,
                step: swapResult.step,
              action: 'swap',
              flowType: 'swap',
              unsignedTransaction: swapResult.unsignedTransaction,
                requireSignature: swapResult.requireSignature,
                swapDetails: swapResult.swapDetails
              };
            } catch (error) {
              console.error('[chatWithOpenAI] Error in AI-routed swap:', error);
              // Fall through to keyword matching
            }
            break;
          }

          case 'launch': {
            console.log('[chatWithOpenAI] AI-routed to: token creation service');
            
            // Check if this is a tutorial/help request
            const lowerMessage = message.toLowerCase();
            const isTutorialQuery = lowerMessage.includes('how do i') || 
                                   lowerMessage.includes('how can i') || 
                                   lowerMessage.includes('how to') ||
                                   lowerMessage.includes('can you create') ||
                                   lowerMessage.includes('show me how');
            
            if (isTutorialQuery) {
              console.log('[chatWithOpenAI] Detected token creation tutorial query, showing guided tutorial');
              
              // Provide a guided tutorial on how to create a token
              const tutorialPrompt = `🚀 **How to Create a Token in This Chat**

I can help you create your own Solana token directly here in the chat! Here's how:

**Step 1: Tell me about your token**
Just say something like:
- "create a token called MyToken"
- "launch a token called SuperCoin with symbol SUP"
- "I want to create MyProject with ticker MYPRJ"

**Step 2: I'll guide you through the setup**
I'll ask you for:
- Token name
- Symbol (ticker)
- Description
- Social links (optional)
- Liquidity pool setup

**Step 3: Sign the transactions**
You'll sign transactions to create the token and optionally set up a liquidity pool.

---

**Try it now!** Simply tell me about the token you want to create. For example:
- "create MyAwesomeToken"
- "I want to launch SuperCoin with symbol SUP"
- "create a token for my project"`;

              return {
                prompt: tutorialPrompt,
                action: 'launch-tutorial'
              };
            }
            
            // Regular launch intent - enhance context with extracted entities
            const enhancedContext = { ...context, ...entities };
            try {
              const creationResult = await this.tokenCreationService.handleCreationIntent(message, enhancedContext);
              if (creationResult) {
                return {
                  prompt: creationResult.prompt,
                  step: creationResult.step,
                  action: 'create-token',
                  unsignedTransaction: creationResult.unsignedTransaction,
                  requireSignature: creationResult.requireSignature,
                  tokenDetails: (creationResult as any).tokenDetails
                };
              }
            } catch (error) {
              console.error('[chatWithOpenAI] Error in AI-routed launch:', error);
              // Fall through to keyword matching
            }
            break;
          }

          case 'price': {
            console.log('[chatWithOpenAI] AI-routed to: price service');
            try {
              // Extract token symbols from entities
              const tokenSymbols = entities.tokenSymbols || [];
              
              // If entities were extracted, use them; otherwise fallback to legacy method
              if (tokenSymbols.length > 0) {
                console.log('[chatWithOpenAI] Fetching prices for tokens:', tokenSymbols);
                
                // Fetch prices for all requested tokens
                const prices = await this.tokenPriceService.getMultipleTokenPrices(tokenSymbols);
                
                // Generate response using OpenAI with the price data
                const systemPrompt = `You are a helpful assistant providing token price information. 
                The user asked about: "${message}"
                
                Current price data:
                ${prices.map(p => `- ${p.symbol}: $${p.usdPrice.toFixed(4)} USD`).join('\n')}
                
                Generate a natural, conversational response. If comparing prices, calculate and explain the difference. 
                Be concise and friendly.`;
                
                const chatResponse = await openai!.chat.completions.create({
                  model: 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                  ],
                  temperature: 0.7,
                  max_tokens: 300
                });
                
                const responseText = chatResponse.choices[0]?.message?.content || 
                  `The current prices are:\n${prices.map(p => `- ${p.symbol}: $${p.usdPrice.toFixed(4)}`).join('\n')}`;
                
                return { 
                  prompt: responseText,
                  entities: { prices, tokenSymbols }
                };
              } else {
                // Fallback to legacy method
                const priceResponse = await this.tokenPriceService.handlePriceQuery(message);
                return { prompt: priceResponse.prompt };
              }
            } catch (error) {
              console.error('[chatWithOpenAI] Error in AI-routed price:', error);
              // Fall through to keyword matching
            }
            break;
          }

          case 'portfolio': {
            console.log('[chatWithOpenAI] AI-routed to: portfolio service');
            const walletAddress = context.walletAddress || (context.user && context.user.walletAddress);
            if (!walletAddress) {
              return { 
                prompt: 'Please connect your wallet to view your portfolio.',
                action: 'portfolio',
                actionData: { requiresWallet: true }
              };
            }
            try {
              // Fetch portfolio data from cache
              const { balanceCacheService } = await import('../services/BalanceCacheService');
              const portfolio = await balanceCacheService.getFromCache(walletAddress);
              
              if (portfolio && portfolio.totalUsdValue > 0) {
                const portfolioMsg = await this.userPortfolioService.formatPortfolioForChat(walletAddress);
                return { 
                  prompt: portfolioMsg,
                  action: 'portfolio',
                  actionData: portfolio,
                  // Store portfolio state for follow-up questions
                  entities: {
                    walletAddress,
                    portfolioData: portfolio,
                    tokens: portfolio.tokens || []
                  }
                };
              } else {
                return { 
                  prompt: 'Your portfolio is currently empty or refreshing. Please check back in a moment.',
                  action: 'portfolio',
                  actionData: { isEmpty: true },
                  entities: { walletAddress }
                };
              }
            } catch (error) {
              console.error('[chatWithOpenAI] Error in AI-routed portfolio:', error);
              return { 
                prompt: 'I encountered an error fetching your portfolio. Please try again.',
                action: 'portfolio',
                actionData: { error: true }
              };
            }
          }

          case 'trending': {
            console.log('[chatWithOpenAI] AI-routed to: trending service');
            try {
              const trendingTokens = await this.trendingService.getTrending(entities.limit || 10);
              const trendingPrompt = this.formatTrendingTokens(trendingTokens);
              return { 
                prompt: trendingPrompt,
                action: 'trending',
                flowType: 'trending',
                // Store trending tokens for follow-up questions
                entities: {
                  trendingTokens,
                  tokenCount: trendingTokens.length,
                  tokens: trendingTokens.map((t: any) => ({
                    symbol: t.symbol,
                    name: t.name,
                    price: t.priceUsd,
                    change24h: t.priceChange?.h24,
                    address: t.address,
                    mint: t.address
                  }))
                }
              };
            } catch (error) {
              console.error('[chatWithOpenAI] Error in AI-routed trending:', error);
              // Fall through to keyword matching
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error('[chatWithOpenAI] Error in intent classification:', error);
      // Fall through to keyword matching
    }

    // === FALLBACK TO KEYWORD MATCHING ===
    console.log('[chatWithOpenAI] Falling back to keyword-based intent detection...');
    
    // Special: Bot capability intent
    if (this.isBotCapabilityQuery(message)) {
      return {
        prompt: `🚀 **Welcome to Yappysol**\n\nYour AI-Powered Solana Assistant\n\nYappysol empowers your crypto journey with powerful chat commands:\n\n🔄 **Token Swaps & Liquidity**\nEasily swap tokens and manage liquidity positions\n\n🎨 **Token Creation & Tracking**\nLaunch your own token or track existing collections\n\n📈 **Portfolio Monitoring**\nTrack your assets and get real-time price updates\n\n💬 **Natural Language DeFi**\nInteract with DeFi protocols using plain English\n\n**Quick Start Commands:**\n- "Create a token"\n- "Swap token"\n- "What is the price of BONK?"\n\n🔒 **Security First:** All actions require wallet confirmation. Yappysol never holds your funds.`
      };
    }
    // Portfolio query detection
    if (this.isPortfolioQuery(message)) {
      const walletAddress = context.walletAddress || (context.user && context.user.walletAddress);
      if (!walletAddress) {
        return { prompt: 'Please connect your wallet to view your portfolio.' };
      }
      console.log('[chatWithOpenAI] Routing to: portfolio service');
      const portfolioMsg = await this.userPortfolioService.formatPortfolioForChat(walletAddress);
      return { prompt: portfolioMsg };
    }
    // Price query detection
    if (this.isPriceQuery(message)) {
      try {
        console.log('[chatWithOpenAI] Routing to: price service');
        const priceResponse = await this.tokenPriceService.handlePriceQuery(message);
        return { prompt: priceResponse.prompt };
      } catch (error) {
        console.error('Error handling price query:', error);
        return { prompt: "Sorry, I couldn't fetch the price information at the moment. Please try again later." };
      }
    }
    // Swap intent detection
    console.log('[chatWithOpenAI] Checking swap intent for message:', message);
    const isSwap = this.isSwapIntent(message);
    console.log('[chatWithOpenAI] Is swap intent:', isSwap);
    if (isSwap) {
      console.log('[chatWithOpenAI] Routing to: swap service');
      console.log('[chatWithOpenAI] Swap context:', JSON.stringify(context, null, 2));
      
      // Extract entities for fallback swap handling
      let fallbackEntities = {};
      try {
        fallbackEntities = await this.entityExtractor.extractEntities(message, 'swap');
        console.log('[chatWithOpenAI] Fallback extracted entities:', fallbackEntities);
      } catch (error) {
        console.error('[chatWithOpenAI] Error extracting entities for fallback swap:', error);
      }
      
      // Enhance context with extracted entities
      const enhancedContext = { ...context, ...fallbackEntities };
      console.log('[chatWithOpenAI] Enhanced swap context:', JSON.stringify(enhancedContext, null, 2));
      
      try {
        const swapResult = await this.tokenSwapService.handleSwapIntent(message, enhancedContext);
        console.log('[chatWithOpenAI] Swap result:', JSON.stringify(swapResult, null, 2));
        return {
          prompt: swapResult.prompt,
          step: swapResult.step,
          action: 'swap',
          flowType: 'swap',
          unsignedTransaction: swapResult.unsignedTransaction,
          requireSignature: swapResult.requireSignature,
          swapDetails: swapResult.swapDetails
        };
      } catch (error) {
        console.error('Error handling swap intent:', error);
        return { prompt: "Sorry, I couldn't process your swap request. Please try again." };
      }
    }
    
    // Create token intent detection
    console.log('[chatWithOpenAI] Checking create token intent for message:', message);
    const isCreateToken = this.isCreateTokenIntent(message);
    console.log('[chatWithOpenAI] Is create token intent:', isCreateToken);
    if (isCreateToken) {
      console.log('[chatWithOpenAI] Routing to: token creation service');
      console.log('[chatWithOpenAI] Create token context:', JSON.stringify(context, null, 2));
      try {
        const creationResult = await this.tokenCreationService.handleCreationIntent(message, context);
        console.log('[chatWithOpenAI] Creation result:', JSON.stringify(creationResult, null, 2));
        if (!creationResult) {
          return { prompt: "Sorry, I couldn't process your token creation request. Please try again." };
        }
        return {
          prompt: creationResult.prompt,
          step: creationResult.step,
          action: 'create-token',
          flowType: 'token-creation',
          unsignedTransaction: creationResult.unsignedTransaction,
          requireSignature: creationResult.requireSignature,
          tokenDetails: (creationResult as any).tokenDetails
        };
      } catch (error) {
        console.error('Error handling token creation intent:', error);
        return { prompt: "Sorry, I couldn't process your token creation request. Please try again." };
      }
    }
    
    // Trending/general intent detection
    if (this.isTrendingQuery(message)) {
      console.log('[chatWithOpenAI] Routing to: trending service');
      try {
        const trendingTokens = await this.trendingService.getTrending(10);
        const conversationalResponse = await this.generateConversationalTrendingResponse(trendingTokens, message);
        return { 
          prompt: conversationalResponse,
          action: 'trending',
          flowType: 'trending',
          tokens: trendingTokens, // Include raw data for frontend
          // Store trending tokens for follow-up questions
          entities: {
            trendingTokens,
            tokenCount: trendingTokens.length,
            tokens: trendingTokens.map((t: any) => ({
              symbol: t.symbol,
              name: t.name,
              price: t.priceUsd,
              change24h: t.priceChange?.h24,
              address: t.address,
              mint: t.address
            }))
          }
        };
      } catch (error) {
        console.error('Error handling trending intent:', error);
        return { prompt: "Sorry, I couldn't fetch trending tokens at the moment. Please try again later." };
      }
    }
    // If a custom system prompt is provided (e.g., degen personality), always use it and skip Solana keyword check
    if (context.systemPrompt) {
      if (!openai) {
        return { prompt: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' };
      }
      const messages = [
        { role: 'system', content: context.systemPrompt },
        ...(context.messages || [])
          .filter((m: any) => typeof m.content === 'string')
          .map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
      });
      const content = completion.choices?.[0]?.message?.content || 'No response from assistant.';
      return { prompt: content };
    }
    // Enhanced intent detection for smarter responses
    const solanaKeywords = ['solana', 'spl', 'defi', 'token', 'coin', 'protocol', 'wallet', 'nft', 'jupiter', 'pump.fun', 'magic eden', 'dex', 'solscan', 'blockchain', 'crypto', 'trading', 'investment', 'market', 'price', 'analysis'];
    const lowerMessage = message.toLowerCase();
    const isSolanaRelated = solanaKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check for specific types of questions that need enhanced responses
    const isTradingQuestion = this.isGeneralTradingQuestion(message);
    const isAnalysisQuestion = this.isMarketAnalysisQuestion(message);
    const isGeneralChatQuestion = this.isGeneralChat(message);
    const isGeneralQuestion = this.isGeneralQuestion(message);
    
    // === RAG INTEGRATION ===
    // Try RAG first for ALL questions (including trading questions)
    // This ensures we get the enhanced fallback response for investment questions
    if (isGeneralQuestion || isTradingQuestion || isAnalysisQuestion) {
      console.log('[chatWithOpenAI] Attempting RAG for question (general/trading/analysis)');
      try {
        // Extract entities for better RAG context
        const entities = await this.entityExtractor.extractEntities(message, 'general');
        const ragResult = await this.ragService.answerQuestion(message, entities, context);
        
        console.log('[chatWithOpenAI] RAG result:', {
          source: ragResult.source,
          confidence: ragResult.confidence,
          haveKB: ragResult.metadata.haveKB
        });
        
        // If RAG found good knowledge base results, use them
        if (ragResult.source === 'knowledge_base' && ragResult.confidence > 0.6) {
          return { 
            prompt: ragResult.answer,
            action: 'rag_answer',
            sources: ragResult.sources,
            metadata: ragResult.metadata
          };
        }
        // If RAG fell back to OpenAI, always use that result (this is the key fix!)
        else if (ragResult.source === 'openai_fallback') {
          return { 
            prompt: ragResult.answer,
            action: 'general_answer',
            metadata: ragResult.metadata
          };
        }
      } catch (error) {
        console.error('[chatWithOpenAI] RAG failed, falling back to regular flow:', error);
        // Continue to regular flow
      }
    }
    
    if (!isSolanaRelated && !isTradingQuestion && !isAnalysisQuestion && !isGeneralChatQuestion) {
      return { prompt: "I'm here to help with Solana and SPL token questions. Ask me anything about Solana DeFi, trading, or token analysis!" };
    }
    // Otherwise, always answer in the context of Solana/SPL/DeFi with enhanced intelligence
    console.log('[chatWithOpenAI] Routing to: enhanced general chat (OpenAI, Solana context)');
    
    if (!openai) {
      return { 
        prompt: 'I\'m Soltikka, your Solana DeFi assistant! I can help you with token swaps, portfolio tracking, trending tokens, and more. However, I need an OpenAI API key to provide detailed responses. Please set the OPENAI_API_KEY environment variable.' 
      };
    }
    
    // Enhanced system prompt for intelligent Solana trading advice and analysis
    let systemPrompt = `You are Soltikka, an expert Solana DeFi trading assistant and blockchain analyst. You are highly knowledgeable about:

🔹 **Solana Ecosystem**: All major protocols, DEXs, and projects
🔹 **Trading & Analysis**: Technical analysis, market trends, risk assessment
🔹 **Token Research**: Due diligence, tokenomics, team analysis
🔹 **DeFi Strategies**: Yield farming, liquidity provision, arbitrage
🔹 **Market Intelligence**: Real-time insights, news impact, sentiment analysis

**Your Capabilities:**
- Provide detailed trading advice and market analysis
- Analyze token fundamentals and technical indicators
- Suggest investment strategies based on market conditions
- Explain complex DeFi concepts in simple terms
- Recommend tokens based on risk tolerance and goals
- Provide real-time market insights and trends
- Help with portfolio diversification strategies

**Response Style:**
- Be conversational and engaging
- Use emojis and formatting for clarity
- Provide actionable insights, not just information
- Include risk warnings when appropriate
- Reference specific protocols, tokens, and metrics
- Be honest about market uncertainties

**Always focus on Solana ecosystem** but provide comprehensive, intelligent analysis that helps users make informed decisions. If asked about general crypto concepts, relate them to Solana's implementation and advantages.`;

    // Add context-specific instructions based on the type of question
    if (isTradingQuestion) {
      systemPrompt += `\n\n**TRADING ADVICE MODE**: The user is asking for trading advice. Provide detailed analysis including:
- Current market conditions and sentiment
- Risk assessment and potential outcomes
- Specific entry/exit strategies if applicable
- Market timing considerations
- Risk management recommendations
- Always include appropriate disclaimers about market risks`;
    }
    
    if (isAnalysisQuestion) {
      systemPrompt += `\n\n**ANALYSIS MODE**: The user wants detailed analysis. Provide comprehensive insights including:
- Technical analysis with specific indicators
- Fundamental analysis of tokenomics and utility
- Market positioning and competitive advantages
- Risk factors and potential red flags
- Long-term viability assessment
- Specific metrics and data points`;
    }
    
    if (isGeneralChatQuestion) {
      systemPrompt += `\n\n**CONVERSATIONAL MODE**: The user is having a general conversation. Be friendly and helpful while:
- Maintaining focus on Solana and DeFi topics
- Providing educational content when appropriate
- Being encouraging for beginners
- Offering to help with specific questions
- Sharing interesting Solana ecosystem insights`;
    }
    
    // Get market context for enhanced responses
    const marketContext = await this.getMarketContext();
    const enhancedMessage = marketContext + message;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(context.messages || [])
        .filter((m: any) => typeof m.content === 'string')
        .map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: enhancedMessage }
    ];
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // Using GPT-4 for better analysis capabilities
      messages,
      temperature: 0.7, // Slightly creative but focused
      max_tokens: 1000, // Allow for detailed responses
    });
    const content = completion.choices?.[0]?.message?.content || 'No response from assistant.';
    return { prompt: content };
    } catch (error) {
      console.error('[chatWithOpenAI] Error:', error);
      return { 
        prompt: "I encountered an error processing your request. Please try again.",
        action: 'error'
      };
    }
  }

  async chatWithDeepSeek(message: string, context: any = {}) {
    console.log('[chatWithDeepSeek] Received message:', message);
    // Portfolio query detection
    if (this.isPortfolioQuery(message)) {
      // Try to get wallet address from context
      const walletAddress = context.walletAddress || (context.user && context.user.walletAddress);
      if (!walletAddress) {
        return { prompt: 'Please connect your wallet to view your portfolio.' };
      }
      console.log('[chatWithDeepSeek] Routing to: portfolio service');
      const portfolioMsg = await this.userPortfolioService.formatPortfolioForChat(walletAddress);
      return { prompt: portfolioMsg };
    }
    // Price query detection
    if (this.isPriceQuery(message)) {
      try {
        console.log('[chatWithDeepSeek] Routing to: price service');
        const priceResponse = await this.tokenPriceService.handlePriceQuery(message);
        return { prompt: priceResponse.prompt };
      } catch (error) {
        console.error('Error handling price query:', error);
        // Fall back to DeepSeek if price query fails
        return { prompt: "Sorry, I couldn't fetch the price information at the moment. Please try again later." };
      }
    }
    console.log('[chatWithDeepSeek] Routing to: general chat');
    // If not a price or portfolio query, use DeepSeek
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          ...(context.messages || []),
          { role: 'user', content: message }
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    // Always wrap DeepSeek response in prompt structure
    const content = response.data.choices?.[0]?.message?.content || 'No response from assistant.';
    return { prompt: content };
  }
} 