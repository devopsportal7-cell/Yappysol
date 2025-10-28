import { VersionedTransaction, Connection, Keypair, Transaction, VersionedMessage } from '@solana/web3.js';
import bs58 from 'bs58';
import FormData from 'form-data';
import fetch from 'node-fetch';
// TEMPORARY: Importing Pinata IPFS upload from referencefile. Move to backend/src/lib/pinata.ts in production.
import { uploadImageToIPFS as pinataUploadImageToIPFS } from '../lib/pinata';
import { WalletService } from './WalletService';
import { WalletModel } from '../models/WalletSupabase';
import { TokenLaunchModel } from '../models/TokenLaunchSupabase';
import { tokenPriceTrackingService } from './TokenPriceTrackingService';

// In-memory session store (replace with Redis in production)
export const tokenCreationSessions: Record<string, any> = {};

const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
const web3Connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Function to get mint address from transaction signature
async function getMintAddressFromTransaction(signature: string): Promise<string | null> {
  try {
    console.log('[DEBUG] Getting transaction without waiting for confirmation:', signature);
    
    // Try to get transaction without waiting for confirmation
    const transaction = await web3Connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    
    if (!transaction || !transaction.meta) {
      console.log('[DEBUG] Transaction not found, trying Solscan API');
      
      // Try Solscan API immediately if transaction not found
      try {
        console.log('[DEBUG] Trying Solscan API as fallback');
        const solscanResponse = await fetch(`https://public-api.solscan.io/transaction/${signature}`);
        if (solscanResponse.ok) {
          const solscanData = await solscanResponse.json();
          console.log('[DEBUG] Solscan response:', JSON.stringify(solscanData, null, 2));
          
          // Look for token creation in Solscan data
          if (solscanData.tokenTransfers && solscanData.tokenTransfers.length > 0) {
            const mintAddress = solscanData.tokenTransfers[0].mint;
            console.log('[DEBUG] Found mint address in Solscan:', mintAddress);
            return mintAddress;
          }
        }
      } catch (solscanError) {
        console.error('[ERROR] Solscan API error:', solscanError);
      }
      
      return null;
    }

    // Method 1: Look for token creation in logs
    if (transaction.meta.logMessages) {
      for (const log of transaction.meta.logMessages) {
        console.log(`[DEBUG] Log: ${log}`);
        
        // Look for various mint creation patterns
        const patterns = [
          /Created mint ([A-Za-z0-9]+)/,
          /Initialize mint ([A-Za-z0-9]+)/,
          /Mint ([A-Za-z0-9]+) created/,
          /Token mint ([A-Za-z0-9]+)/
        ];
        
        for (const pattern of patterns) {
          const match = log.match(pattern);
          if (match) {
            const mintAddress = match[1];
            console.log('[DEBUG] Found mint address in logs:', mintAddress);
            return mintAddress;
          }
        }
      }
    }

          // Method 2: Look for token program instructions
      const instructions = 'instructions' in transaction.transaction.message 
        ? transaction.transaction.message.instructions 
        : ('compiledInstructions' in transaction.transaction.message ? transaction.transaction.message.compiledInstructions : []);
      
    if (instructions) {
      for (const instruction of instructions) {
        let programId;
        let accounts: number[] = [];
        
        // Handle different instruction types
        if ('programIdIndex' in instruction && 'accountKeyIndexes' in instruction) {
          // Compiled instruction (V0)
          programId = transaction.transaction.message.staticAccountKeys[instruction.programIdIndex];
          accounts = instruction.accountKeyIndexes;
        } else if ('programId' in instruction && 'accounts' in instruction) {
          // Legacy instruction
          programId = instruction.programId;
          accounts = instruction.accounts;
        }
        
        if (programId && programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
          console.log('[DEBUG] Found token program instruction');
          if (accounts && accounts.length > 0) {
            let mintAddress;
            if ('accountKeyIndexes' in instruction) {
              // V0 transaction
              const accountIndex = accounts[0];
              mintAddress = transaction.transaction.message.staticAccountKeys[accountIndex].toString();
            } else {
              // Legacy transaction
              mintAddress = accounts[0].toString();
            }
            console.log('[DEBUG] Found mint address in instruction:', mintAddress);
            return mintAddress;
          }
        }
      }
    }

    // Method 3: Look for new token accounts in postTokenBalances
    if (transaction.meta.postTokenBalances) {
      for (const balance of transaction.meta.postTokenBalances) {
        if (balance.mint && balance.owner) {
          console.log('[DEBUG] Found new token balance:', balance.mint);
          return balance.mint;
        }
      }
    }
    
    console.log('[DEBUG] No mint address found in transaction, trying Solscan API');
    
    // Method 4: Try to get mint address from Solscan API
    try {
      console.log('[DEBUG] Trying Solscan API as fallback');
      const solscanResponse = await fetch(`https://public-api.solscan.io/transaction/${signature}`);
      if (solscanResponse.ok) {
        const solscanData = await solscanResponse.json();
        console.log('[DEBUG] Solscan response:', JSON.stringify(solscanData, null, 2));
        
        // Look for token creation in Solscan data
        if (solscanData.tokenTransfers && solscanData.tokenTransfers.length > 0) {
          const mintAddress = solscanData.tokenTransfers[0].mint;
          console.log('[DEBUG] Found mint address in Solscan:', mintAddress);
          return mintAddress;
        }
      }
    } catch (solscanError) {
      console.error('[ERROR] Solscan API error:', solscanError);
    }
    
    return null;
  } catch (error) {
    console.error('[ERROR] Failed to get transaction:', error);
    return null;
  }
}

const TOKEN_CREATION_STEPS = [
  'name',
  'symbol',
  'description',
  'image',
  'twitter',
  'telegram',
  'website',
  'pool',
  'amount',
  'confirmation'
];

function getNextStep(currentStep: string | null) {
  if (!currentStep) return TOKEN_CREATION_STEPS[0];
  const idx = TOKEN_CREATION_STEPS.indexOf(currentStep);
  return TOKEN_CREATION_STEPS[idx + 1] || null;
}

function getPreviousStep(currentStep: string | null) {
  if (!currentStep) return null;
  const idx = TOKEN_CREATION_STEPS.indexOf(currentStep);
  return idx > 0 ? TOKEN_CREATION_STEPS[idx - 1] : null;
}

function validateStepInput(step: string, input: any): string | null {
  switch (step) {
    case 'name':
      if (!input || input.length < 2 || input.length > 50) return 'Name must be 2-50 characters.';
      return null;
    case 'symbol':
      if (!/^[A-Z0-9]{2,10}$/.test(input)) return 'Ticker must be 2-10 uppercase letters or numbers.';
      return null;
    case 'amount':
      if (input === undefined || isNaN(Number(input)) || Number(input) < 0) return 'Amount must be zero or a positive number.';
      // For Bonk, provide guidance about minimum requirements
      if (input === 0) return 'Amount must be greater than 0. For Bonk pool, minimum 0.01 SOL is recommended.';
      return null;
    case 'description':
      if (!input || input.length < 5) return 'Description is too short.';
      return null;
    case 'twitter':
    case 'telegram':
    case 'website':
      if (input && !/^https?:\/\//.test(input)) return 'Must be a valid URL.';
      return null;
    case 'pool':
      if (!input || !['pump', 'bonk'].includes(input.toLowerCase())) return 'Pool must be either "pump" or "bonk".';
      return null;
    default:
      return null;
  }
}

async function createTokenMetadata(
  name: string,
  symbol: string,
  description: string,
  imageFile: Express.Multer.File,
  twitter: string,
  telegram: string,
  website: string,
  pool: string
): Promise<string> {
  if (pool === 'pump') {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("symbol", symbol);
    formData.append("description", description);
    formData.append("twitter", twitter);
    formData.append("telegram", telegram);
    formData.append("website", website);
    formData.append("showName", "true");
    formData.append("file", imageFile.buffer, {
      filename: imageFile.originalname,
      contentType: imageFile.mimetype
    });

    // Debug log for form data fields and image size
    console.log('[DEBUG] FormData fields:', {
      name,
      symbol,
      description,
      twitter,
      telegram,
      website,
      showName: "true",
      imageFileName: imageFile.originalname,
      imageMimeType: imageFile.mimetype,
      imageSize: imageFile.buffer.length
    });

    const response = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: formData,
    });
    const text = await response.text();
    console.log('[DEBUG] Pump API raw response:', text);
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Pump API did not return valid JSON: ${text}`);
    }
    return data.metadataUri;
  } else if (pool === 'bonk') {
    // For Bonk, we need to upload image to IPFS first, then create metadata
    const imageUri = await pinataUploadImageToIPFS(imageFile);
    
    // Prepare metadata payload, only include website if it's not empty
    const metadataPayload: any = {
      createdOn: "https://bonk.fun",
      description,
      image: imageUri, // Use IPFS URI instead of base64
      name,
      symbol
    };
    
    // Only add website if it's not empty
    if (website && website.trim() !== '') {
      metadataPayload.website = website;
    }
    
    console.log('[DEBUG] Bonk metadata payload:', JSON.stringify(metadataPayload, null, 2));
    
    const response = await fetch("https://nft-storage.letsbonk22.workers.dev/upload/meta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadataPayload),
    });
    
    const responseText = await response.text();
    console.log('[DEBUG] Bonk metadata response:', responseText);
    return responseText;
  }
  throw new Error('Invalid pool type');
}

async function createTokenTransaction(
  publicKey: string,
  tokenMetadata: any,
  mint: string,
  amount: number,
  pool: string
): Promise<{ unsignedTransaction: string, signature?: string, mint?: string, error?: string, detailedMessage?: string }> {
  // Pump uses Local Transaction API, Bonk uses Lightning Transaction API
  const baseUrl = pool === 'pump' ? 'https://pumpportal.fun/api/trade-local' : 'https://pumpportal.fun/api/trade';
  
  // Get or create API key for Bonk pool
  let apiKey = process.env.PUMP_PORTAL_API_KEY;
  console.log('[DEBUG] Initial API key check:', { pool, hasApiKey: !!apiKey });
  
  // For Bonk pool, always try to get a fresh API key if the current one fails
  if (pool === 'bonk') {
    try {
      // First, try to get a fresh API key
      console.log('[DEBUG] Creating new wallet and API key for Bonk pool');
      const walletResponse = await fetch("https://pumpportal.fun/api/create-wallet", {
        method: "GET",
      });
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        apiKey = walletData.apiKey;
        console.log('[DEBUG] Generated fresh API key:', apiKey);
        
        // Log wallet information for debugging
        if (walletData.wallet) {
          console.log('[DEBUG] Generated wallet address:', walletData.wallet);
        }
      } else {
        console.error('[ERROR] Failed to create wallet, response status:', walletResponse.status);
        const errorText = await walletResponse.text();
        console.error('[ERROR] Wallet creation error:', errorText);
        throw new Error('Failed to create wallet and API key');
      }
    } catch (error) {
      console.error('[ERROR] Failed to create wallet and API key:', error);
      throw new Error('Failed to create wallet and API key for Bonk pool');
    }
  }
  
  console.log('[DEBUG] Final API key check:', { pool, hasApiKey: !!apiKey, apiKey });
  
  const payload: any = {
    action: "create",
    tokenMetadata,
    mint,
    denominatedInSol: "true",
    amount,
    slippage: 10, // Increased slippage for better success rate
    priorityFee: 0.0005, // Higher priority fee like in the Python example
    pool
  };
  
  // For Bonk, add the wallet address if we have it
  if (pool === 'bonk' && apiKey) {
    // Try to get wallet info from the API key
    try {
      const walletInfoResponse = await fetch(`https://pumpportal.fun/api/wallet-info?api-key=${apiKey}`);
      if (walletInfoResponse.ok) {
        const walletInfo = await walletInfoResponse.json();
        if (walletInfo.wallet) {
          payload.wallet = walletInfo.wallet;
          console.log('[DEBUG] Added wallet to payload:', walletInfo.wallet);
        }
      }
    } catch (error) {
      console.log('[DEBUG] Could not get wallet info:', error);
    }
  }
  
  console.log('[DEBUG] Mint parameter being passed to API:', mint);
  console.log('[DEBUG] Mint parameter length:', mint.length);
  console.log('[DEBUG] Pool type:', pool);
  

  
  // Add publicKey only for Pump (Local Transaction API)
  if (pool === 'pump') {
    payload.publicKey = publicKey;
  }
  console.log('[DEBUG] Pump/BONK portal payload:', JSON.stringify(payload, null, 2));

  const headers = {
    "Content-Type": "application/json"
  };
  
  // Add API key as query parameter for Bonk (matching documentation)
  const url = pool === 'bonk' ? `${baseUrl}?api-key=${apiKey}` : baseUrl;
  
  console.log('[DEBUG] Request details:', { 
    url, 
    method: "POST", 
    headers, 
    hasApiKey: !!apiKey 
  });
  
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  console.log('[DEBUG] API Response status:', response.status);
  console.log('[DEBUG] API Response headers:', Object.fromEntries(response.headers.entries()));

  if (response.status !== 200) {
    const errorText = await response.text();
    console.log('[DEBUG] API Error response:', errorText);
    throw new Error(`Failed to create token: ${response.statusText} - ${errorText}`);
  }

  if (pool === 'pump') {
    // Pump returns unsigned transaction (array buffer)
    const responseBuffer = await response.arrayBuffer();
    return { 
      unsignedTransaction: Buffer.from(responseBuffer).toString('base64'),
      mint
    };
  } else {
    // Bonk returns signed transaction (JSON with signature)
    const responseText = await response.text();
    console.log('[DEBUG] Bonk API raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Bonk API did not return valid JSON: ${responseText}`);
    }
    
    // Check if the response contains errors
    if (data.errors && data.errors.length > 0) {
      console.log('[DEBUG] Bonk API returned errors:', data.errors);
      throw new Error(`Failed to create token: ${data.errors.join(', ')}`);
    }
    
    // Check if we have a valid signature
    if (!data.signature) {
      console.log('[DEBUG] No signature in response:', data);
      throw new Error('No transaction signature received from API');
    }
    
    console.log('[DEBUG] Bonk API response:', JSON.stringify(data, null, 2));
    
    // Check if the response contains the mint address directly
    if (data.mint) {
      console.log('[DEBUG] Found mint address in API response:', data.mint);
      return { 
        unsignedTransaction: '', // Bonk doesn't return unsigned transaction
        signature: data.signature,
        mint: data.mint
      };
    }
    
    // For Bonk, try to get the actual mint address from the transaction
    console.log('[DEBUG] Attempting to get mint address from transaction:', data.signature);
    
    // First, check if the transaction exists on Solscan and analyze its status
    try {
      console.log('[DEBUG] Checking transaction status on Solscan...');
      
      // Wait a bit for transaction to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const solscanResponse = await fetch(`https://public-api.solscan.io/transaction/${data.signature}`);
      
      if (solscanResponse.status === 404) {
        console.log('[DEBUG] Transaction not found on Solscan - waiting and retrying...');
        
        // Wait a bit more and retry
        await new Promise(resolve => setTimeout(resolve, 3000));
        const retryResponse = await fetch(`https://public-api.solscan.io/transaction/${data.signature}`);
        
        if (retryResponse.status === 404) {
          console.log('[DEBUG] Transaction still not found after retry - it may have failed');
          
          // Provide more specific error information
          const specificError = `Transaction failed to confirm on blockchain. This usually happens when:
          
1. **Network congestion** - Try again in a few minutes
2. **Insufficient balance** - The API wallet may not have enough SOL
3. **High network fees** - Current network conditions may require higher fees
4. **Temporary API issues** - Bonk.fun API may be experiencing issues

**Transaction Details:**
- Signature: ${data.signature}
- Amount: ${amount} SOL
- Pool: ${pool}
- Priority Fee: 0.0005 SOL
- Slippage: 10%

**Recommendations:**
- Wait 5-10 minutes and try again
- Check [Bonk.fun status](https://bonk.fun) for any issues
- Consider trying with Pump.fun instead (different pool)`;
          
          return { 
            unsignedTransaction: '', // Bonk doesn't return unsigned transaction
            signature: data.signature,
            mint: undefined,
            error: specificError
          };
        }
      }
      
      if (solscanResponse.ok) {
        const solscanData = await solscanResponse.json();
        console.log('[DEBUG] Solscan transaction data:', JSON.stringify(solscanData, null, 2));
        
        // Check if transaction failed
        if (solscanData.err || (solscanData.meta && solscanData.meta.err)) {
          const error = solscanData.err || solscanData.meta.err;
          console.log('[DEBUG] Transaction failed with error:', error);
          
          // Analyze the error to provide specific feedback
          let errorMessage = 'Transaction failed';
          if (error === 'InsufficientFundsForRent') {
            errorMessage = 'Insufficient SOL for transaction fees. Please add more SOL to your wallet.';
          } else if (error === 'InsufficientFunds') {
            errorMessage = 'Insufficient SOL balance. Please add more SOL to your wallet.';
          } else if (typeof error === 'object' && error.InstructionError) {
            const instructionError = error.InstructionError[1];
            if (typeof instructionError === 'object' && instructionError.Custom) {
              // Custom program errors
              const customError = instructionError.Custom;
              if (customError === 1) {
                errorMessage = 'Insufficient SOL balance. Please add more SOL to your wallet.';
              } else {
                errorMessage = `Transaction failed with custom error: ${customError}`;
              }
            } else {
              errorMessage = `Transaction failed: ${JSON.stringify(instructionError)}`;
            }
          } else {
            errorMessage = `Transaction failed: ${JSON.stringify(error)}`;
          }
          
          return { 
            unsignedTransaction: '', // Bonk doesn't return unsigned transaction
            signature: data.signature,
            mint: undefined,
            error: errorMessage
          };
        }
      }
    } catch (error) {
      console.log('[DEBUG] Error checking Solscan:', error);
    }
    
    const actualMintAddress = await getMintAddressFromTransaction(data.signature);
    
    if (actualMintAddress) {
      console.log('[DEBUG] Found actual mint address from transaction:', actualMintAddress);
      return { 
        unsignedTransaction: '', // Bonk doesn't return unsigned transaction
        signature: data.signature,
        mint: actualMintAddress
      };
            } else {
          console.log('[DEBUG] Could not extract mint address, returning transaction signature for manual check');
          
          // Provide more detailed information about the transaction
          const detailedMessage = `🎉 Transaction submitted successfully!\n\n` +
            `**Transaction Details:**\n` +
            `- Signature: ${data.signature}\n` +
            `- Amount: ${amount} SOL\n` +
            `- Pool: ${pool}\n\n` +
            `[View Transaction on Solscan](https://solscan.io/tx/${data.signature})\n\n` +
            `**Note:** The token may take a few minutes to appear. If the transaction shows as failed, please check:\n` +
            `- Network congestion\n` +
            `- Sufficient balance for fees\n` +
            `- Try again with a higher priority fee`;
          
          return { 
            unsignedTransaction: '', // Bonk doesn't return unsigned transaction
            signature: data.signature,
            mint: undefined, // Let the frontend handle this case
            detailedMessage
          };
        }
  }
}

export class TokenCreationService {
  // Multi-step chat flow for token creation
  async handleCreationIntent(message: string, context: any) {
    const userId = context.userId || 'default';
    const userInput = message.trim();
    
    // Always handle cancel/abort first
    if (userInput.toLowerCase() === 'cancel' || userInput.toLowerCase() === 'abort') {
      delete tokenCreationSessions[userId];
      return { prompt: 'Token creation cancelled.', step: null };
    }
    
    // If the message is 'create token', reset the session
    if (message.trim().toLowerCase() === 'create token') {
      console.log('[DEBUG] Resetting token creation session for user:', userId);
      delete tokenCreationSessions[userId];
    }
    
    let session = tokenCreationSessions[userId] || { step: null };
    
    // Use currentStep from context if available, otherwise use session step
    let step = context.currentStep || session.step;
    
    // Update session with current step
    session.step = step;
    tokenCreationSessions[userId] = session;

    // Interruption confirmation logic (moved up)
    if (session.awaitingInterruptConfirm) {
      if (userInput.trim().toLowerCase() === 'yes') {
        delete tokenCreationSessions[userId];
        return { prompt: 'Token creation flow interrupted. Please initiate the process again.', step: null };
      } else if (userInput.trim().toLowerCase() === 'no') {
        session.awaitingInterruptConfirm = false;
        tokenCreationSessions[userId] = session;
        // Repeat the current step prompt
        let prompt = '';
        switch (session.step) {
          case 'name': prompt = 'What is the name of your token?'; break;
          case 'symbol': prompt = 'What is the ticker? (2-10 uppercase letters or numbers)'; break;
          case 'description': prompt = 'Please provide a description.'; break;
          case 'image': prompt = 'Please upload an image for your token.'; break;
          case 'twitter': prompt = 'Twitter link? (must be a valid URL, or type "skip" to leave blank)'; break;
          case 'telegram': prompt = 'Telegram link? (must be a valid URL, or type "skip" to leave blank)'; break;
          case 'website': prompt = 'Website? (must be a valid URL, or type "skip" to leave blank)'; break;
          case 'pool': prompt = 'Which pool would you like to use? (pump)'; break;
          case 'amount': prompt = 'How much SOL do you want to launch with? (Minimum 0.01 SOL recommended for Pump pool)'; break;
          case 'confirmation': prompt = 'Type "proceed" to create your token or "cancel" to abort.'; break;
          default: prompt = 'Please continue the token creation process.'; break;
        }
        return { prompt, step: session.step };
      } else {
        return { prompt: 'Reply "yes" to confirm interruption and reset, or "no" to continue the token creation process.', step: session.step };
      }
    }

    // If no step, this is the first call after reset: prompt for name and do NOT advance
    if (!step) {
      step = 'name';
      session.step = step;
      // Set default pool to 'pump' for new sessions
      session.pool = 'pump';
      tokenCreationSessions[userId] = session;
      const prompt = 'What is the name of your token?';
      console.log('[DEBUG] Returning step:', step, 'prompt:', prompt);
      return { prompt, step, flowType: 'token-creation' };
    }

    // Handle back
    if (userInput.toLowerCase() === 'back') {
      const prevStep = getPreviousStep(step);
      if (!prevStep) return { prompt: 'Already at the first step.', step };
      session.step = prevStep;
      tokenCreationSessions[userId] = session;
      return { prompt: `Going back. Please provide ${prevStep}.`, step: prevStep };
    }

    // Start or continue session
    if (!step) step = 'name';

    // Save input for current step
    if (step) {
      if (["twitter", "telegram", "website"].includes(step) && userInput.trim().toLowerCase() === "skip") {
        session[step] = '';
      } else if (step === 'symbol') {
        session[step] = userInput.trim().toUpperCase();
      } else if (step === 'amount') {
        let amount = Number(userInput);
        // For Bonk, if user enters 0, set a minimum amount
        if (session.pool === 'bonk' && amount === 0) {
          amount = 0.02; // Increased to 0.02 SOL to ensure API wallet has enough SOL for fees
          console.log('[DEBUG] User entered 0 SOL for Bonk, setting minimum amount to 0.02 SOL');
        }
        // For Pump, if user enters 0, set a minimum amount
        if (session.pool === 'pump' && amount === 0) {
          amount = 0.01; // Minimum amount for Pump.fun
          console.log('[DEBUG] User entered 0 SOL for Pump, setting minimum amount to 0.01 SOL');
        }
        session[step] = amount;
      } else if (step === 'pool') {
        session[step] = userInput.toLowerCase();
        // If user doesn't specify a pool, default to 'pump'
        if (!session[step] || !['pump', 'bonk'].includes(session[step])) {
          session[step] = 'pump';
        }
      } else {
        session[step] = userInput;
      }
      // Validate input (skip validation for socials if skipped)
      let validationError = null;
      if (["twitter", "telegram", "website"].includes(step) && userInput.trim().toLowerCase() === "skip") {
        validationError = null;
      } else {
        validationError = validateStepInput(step, session[step]);
      }
      if (validationError) {
        session.validationErrorCount = (session.validationErrorCount || 0) + 1;
        tokenCreationSessions[userId] = session;
        if (session.validationErrorCount >= 3) {
          session.awaitingInterruptConfirm = true;
          session.validationErrorCount = 0;
          return { prompt: 'It looks like you may want to interrupt the token creation flow. Reply "yes" to confirm interruption and reset, or "no" to continue.', step };
        }
        return { prompt: validationError, step };
      }
      session.validationErrorCount = 0;
    }

    // Advance to next step
    const nextStep = getNextStep(step);
    session.step = nextStep;
    tokenCreationSessions[userId] = session;

    // Only prompt for the next step, not the current one
    if (nextStep) {
      let prompt = '';
      switch (nextStep) {
        case 'name': prompt = 'What is the name of your token?'; break;
        case 'symbol': prompt = 'What is the ticker? (2-10 uppercase letters or numbers)'; break;
        case 'description': prompt = 'Please provide a description.'; break;
        case 'image': prompt = 'Please upload an image for your token.'; break;
        case 'twitter': prompt = 'Twitter link? (must be a valid URL, or type "skip" to leave blank)'; break;
        case 'telegram': prompt = 'Telegram link? (must be a valid URL, or type "skip" to leave blank)'; break;
        case 'website': prompt = 'Website? (must be a valid URL, or type "skip" to leave blank)'; break;
        case 'pool': prompt = 'Which pool would you like to use? (pump)'; break;
        case 'amount': prompt = 'How much SOL do you want to launch with? (Minimum 0.01 SOL recommended for Pump pool)'; break;
        case 'confirmation': {
          // Get wallet and fee information based on pool type
          let walletInfo = null;
          let fees = null;
          let summary = `Please review your token details:\n` +
            `Name: ${session.name}\n` +
            `Ticker: ${session.symbol}\n` +
            `Amount: ${session.amount}${session.pool === 'pump' && session.amount === 0.01 ? ' (minimum required for Pump)' : ''}\n` +
            `Description: ${session.description}\n` +
            `Twitter: ${session.twitter || 'Not provided'}\n` +
            `Telegram: ${session.telegram || 'Not provided'}\n` +
            `Website: ${session.website || 'Not provided'}\n` +
            `Pool: ${session.pool}\n`;

          // Add transaction details based on pool type
          if (session.pool === 'pump') {
            // For Pump.fun: Show user's wallet and fees
            try {
              walletInfo = await WalletService.getUserDefaultWallet(userId);
              if (walletInfo) {
                fees = WalletService.calculateTransactionFees('token-creation', session.amount);
                summary += `\n💰 **Transaction Details:**\n` +
                  `Wallet: ${walletInfo.publicKey.slice(0, 8)}...${walletInfo.publicKey.slice(-8)}\n` +
                  `Balance: ${walletInfo.balance.toFixed(6)} SOL\n` +
                  `Network Fee: ${fees.networkFee.toFixed(6)} SOL\n` +
                  `Priority Fee: ${fees.priorityFee.toFixed(6)} SOL\n` +
                  `Total Cost: ${fees.estimatedCost.toFixed(6)} SOL\n`;
              }
            } catch (error) {
              console.error('Error getting wallet info for confirmation:', error);
            }
          } else if (session.pool === 'bonk') {
            // For Bonk.fun: Show API wallet information
            summary += `\n💰 **Transaction Details:**\n` +
              `Pool: Bonk.fun (API Wallet)\n` +
              `Amount: ${session.amount} SOL\n` +
              `Note: Transaction will be signed by API wallet\n`;
          }

          summary += `\nType 'proceed' to create your token or 'cancel' to abort.`;
          prompt = summary;
          break;
        }
        default: prompt = 'Invalid step.'; break;
      }
      console.log('[DEBUG] Returning step:', nextStep, 'prompt:', prompt);
      return { prompt, step: nextStep, flowType: 'token-creation' };
    }

    // If we've completed all steps, handle the confirmation
    if (step === 'confirmation') {
      if (userInput.toLowerCase().includes('proceed')) {
        try {
          // Proceed with token creation
          const result = await this.createToken({
            name: session.name,
            symbol: session.symbol,
            amount: session.amount,
            description: session.description,
            twitter: session.twitter,
            telegram: session.telegram,
            website: session.website,
            pool: session.pool,
            imageFile: session.imageFile,
            userId: userId
          });
          delete tokenCreationSessions[userId];

          // If an unsigned transaction is generated (Pump flow), return it for signing
          if (result && typeof result === 'object' && 'unsignedTransaction' in result && result.unsignedTransaction) {
            return {
              prompt: 'Unsigned transaction generated. Please sign and submit with your wallet.',
              unsignedTransaction: result.unsignedTransaction,
              mint: result.mint,
              requireSignature: true,
              action: 'token-creation',
              step: null
            };
          }

          // If a signature is present (Bonk flow), return success
          if (result && typeof result === 'object' && ('signature' in result || 'mint' in result) && result.mint) {
            const platform = session.pool === 'bonk' ? 'bonk.fun' : 'pump.fun';
            const successMessage = `🎉 Token created successfully! [View on ${platform}](http://${platform}/coin/${result.mint}) | [View on Solscan](https://solscan.io/token/${result.mint})`;
            console.log('[DEBUG] handleCreationIntent success message:', successMessage);
            return {
              prompt: successMessage,
              mint: result.mint,
              action: 'token-creation',
              step: null
            };
          }

          // If there's an error in the result, return the error
          if (result && typeof result === 'object' && result.action === 'error') {
            console.log('[DEBUG] handleCreationIntent error result:', result);
            return {
              prompt: result.prompt,
              signature: result.signature,
              action: 'error',
              step: null
            };
          }

          // Fallback
          return { prompt: 'Token creation initiated. Please check your wallet.', step: null };
        } catch (error: any) {
          console.error('[ERROR] Token creation failed:', error);
          return { prompt: `Failed to create token: ${error.message}`, step: null };
        }
      } else {
        return { prompt: 'Token creation cancelled.', step: null };
      }
    }
  }

  getSession(userId: string) {
    return tokenCreationSessions[userId] || null;
  }

  cancelSession(userId: string) {
    delete tokenCreationSessions[userId];
    return { prompt: 'Token creation cancelled.' };
  }

  async createToken(params: any) {
    if (!params.userId) {
      throw new Error('No userId provided for token creation.');
    }

    // Get wallet info for both pools (needed for transaction creation)
    const walletInfo = await WalletService.getUserDefaultWallet(params.userId);
    if (!walletInfo) {
      throw new Error('No wallet found for user. Please create or import a wallet first.');
    }

    // Create database record for the launch AFTER wallet validation
    const launchRecord = await TokenLaunchModel.createLaunch({
      userId: params.userId,
      sessionId: params.sessionId,
      tokenName: params.name,
      tokenSymbol: params.symbol,
      description: params.description,
      imageUrl: params.imageUrl,
      twitterUrl: params.twitter,
      telegramUrl: params.telegram,
      websiteUrl: params.website,
      poolType: params.pool,
      launchAmount: params.amount,
      initialSupply: params.initialSupply,
      decimals: params.decimals
    });

    try {

    // For Pump.fun: Validate user's wallet balance
    // For Bonk.fun: Skip balance validation (uses API wallet)
    if (params.pool === 'pump') {
      const fees = WalletService.calculateTransactionFees('token-creation', params.amount);
      const balanceCheck = await WalletService.hasSufficientBalance(
        walletInfo.id, 
        params.amount, 
        fees
      );

      if (!balanceCheck.sufficient) {
        throw new Error(
          `Insufficient balance. Need ${balanceCheck.required?.toFixed(6)} SOL, have ${balanceCheck.currentBalance.toFixed(6)} SOL. ` +
          `Please add ${balanceCheck.shortfall?.toFixed(6)} SOL to your wallet.`
        );
      }
    }
    // For Bonk.fun, we skip user wallet validation since it uses API wallets

    // Create token metadata (this handles image upload for both Pump and Bonk)
    const metadataUri = await createTokenMetadata(
      params.name,
      params.symbol,
      params.description,
      params.imageFile,
      params.twitter || '',
      params.telegram || '',
      params.website || '',
      params.pool
    );

    // Generate a keypair for both Pump and Bonk
    // For Pump, we use it for signing
    // For Bonk, we pass the secret key to the API
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey.toBase58();

    // Create token transaction
    const result = await createTokenTransaction(
      params.pool === 'pump' ? walletInfo.publicKey : '', // Only use user's wallet for Pump.fun
      {
        name: params.name,
        symbol: params.symbol,
        uri: metadataUri
      },
      params.pool === 'pump' ? mintAddress : bs58.encode(mintKeypair.secretKey), // For Bonk, pass the secret key as base58
      params.amount,
      params.pool
    );

    // If this is a pump transaction, sign it with user's private key
    if (result.unsignedTransaction) {
      try {
        console.log('[DEBUG] Signing Pump transaction with user\'s private key');
        
        // Get user's keypair from stored private key
        const userKeypair = await WalletModel.getKeypair(walletInfo.id);
        
        // Decode the unsigned transaction - Pump portal returns VersionedTransaction
        const transactionBytes = Uint8Array.from(atob(result.unsignedTransaction), c => c.charCodeAt(0));
        
        // Try to deserialize as VersionedTransaction first
        let transaction: VersionedTransaction | Transaction;
        try {
          transaction = VersionedTransaction.deserialize(transactionBytes);
          console.log('[DEBUG] Transaction deserialized as VersionedTransaction');
        } catch (e) {
          // Fallback to legacy transaction if versioned deserialization fails
          console.log('[DEBUG] Falling back to legacy Transaction deserialization');
          transaction = Transaction.from(transactionBytes);
        }
        
        // Sign the transaction with BOTH keypairs (mint AND user)
        // According to PumpPortal docs: tx.sign([mintKeypair, signerKeyPair])
        let signature: string | undefined;
        
        // Use Helius RPC instead of public Solana RPC to avoid rate limits
        const heliusRpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(heliusRpcUrl);
        
        if (transaction instanceof VersionedTransaction) {
          transaction.sign([mintKeypair, userKeypair]); // BOTH keypairs must sign
          
          // Add retry logic for rate limits
          let retries = 3;
          while (retries > 0) {
            try {
              signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: true, // Skip preflight to avoid extra RPC calls
                maxRetries: 0 // We'll handle retries manually
              });
              console.log('[DEBUG] Pump transaction signed and submitted (VersionedTransaction):', signature);
              break;
            } catch (error: any) {
              retries--;
              if (error.message && error.message.includes('429') && retries > 0) {
                console.log(`[DEBUG] Rate limited, retrying in ${3 - retries} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
              } else {
                throw error;
              }
            }
          }
        } else {
          // Legacy transactions need to be signed with the first keypair only
          (transaction as Transaction).sign(mintKeypair);
          (transaction as Transaction).partialSign(userKeypair);
          
          // Add retry logic for rate limits
          let retries = 3;
          while (retries > 0) {
            try {
              signature = await connection.sendRawTransaction((transaction as Transaction).serialize(), {
                skipPreflight: true,
                maxRetries: 0
              });
              console.log('[DEBUG] Pump transaction signed and submitted (Legacy Transaction):', signature);
              break;
            } catch (error: any) {
              retries--;
              if (error.message && error.message.includes('429') && retries > 0) {
                console.log(`[DEBUG] Rate limited, retrying in ${3 - retries} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
              } else {
                throw error;
              }
            }
          }
        }
        
        // Ensure signature was obtained
        if (!signature) {
          throw new Error('Failed to obtain transaction signature after retries');
        }
        
        // Update launch record with success
        try {
          await TokenLaunchModel.updateLaunch(launchRecord.id, {
            mintAddress: mintKeypair.publicKey.toBase58(), // Store mint address
            transactionSignature: signature,
            status: 'completed'
          });
        } catch (updateError: any) {
          console.error('[TokenCreationService] Failed to update launch record:', updateError);
          // Continue even if update fails
        }

        // Start price tracking for the new token
        setTimeout(async () => {
          try {
            await tokenPriceTrackingService.getTokenPrice(mintKeypair.publicKey.toBase58());
          } catch (error) {
            console.error('[TokenCreationService] Error starting price tracking:', error);
          }
        }, 5000); // Wait 5 seconds for token to be available

        const platform = 'pump.fun';
        const successMessage = `🎉 Token "${params.name}" (${params.symbol}) created successfully on ${platform}!\n\n` +
          `**Token Details:**\n` +
          `- Name: ${params.name}\n` +
          `- Symbol: ${params.symbol}\n` +
          `- Mint Address: ${mintKeypair.publicKey.toBase58()}\n` +
          `- Transaction: ${signature}\n` +
          `- Platform: ${platform}\n\n` +
          `[View Token on Solscan](https://solscan.io/token/${mintKeypair.publicKey.toBase58()})\n` +
          `[View Transaction](https://solscan.io/tx/${signature})\n\n` +
          `Your token is now live and trading! 🚀`;

        return {
          prompt: successMessage,
          signature: signature,
          mint: mintKeypair.publicKey.toBase58(),
          launchId: launchRecord.id,
          step: null // Flow completed
        };
        
      } catch (signingError: any) {
        console.error('[ERROR] Failed to sign Pump transaction:', signingError);
        
        // Update launch record with failure (omit fields that don't exist in DB)
        try {
          await TokenLaunchModel.updateLaunch(launchRecord.id, {
            status: 'failed'
          });
        } catch (updateError: any) {
          console.error('[TokenCreationService] Failed to update launch record:', updateError);
          // Continue even if update fails - transaction signing error is more important
        }

        return {
          prompt: `Failed to sign transaction: ${signingError.message}. Please try again.`,
          step: null
        };
      }
    }

    // If this is a Bonk transaction, return success message directly
    if (result.signature) {
      const platform = params.pool === 'bonk' ? 'bonk.fun' : 'pump.fun';
      
      if (result.error) {
        // Update launch record with failure (omit errorMessage if column doesn't exist in DB)
        try {
          await TokenLaunchModel.updateLaunch(launchRecord.id, {
            transactionSignature: result.signature,
            status: 'failed'
          });
        } catch (updateError) {
          console.error('[TokenCreationService] Failed to update launch record:', updateError);
        }

        // Transaction failed
        let errorMessage = `❌ ${result.error}\n\n[View Transaction on Solscan](https://solscan.io/tx/${result.signature})`;
        
        // Add specific guidance based on error type
        if (result.error.includes('Insufficient SOL')) {
          errorMessage += '\n\n💡 **Solution**: Add more SOL to your wallet and try again.';
        } else if (result.error.includes('Transaction failed to confirm')) {
          errorMessage += '\n\n💡 **Alternative**: Try creating with Pump.fun instead by saying "create token with pump"';
        } else if (result.error.includes('Transaction not found')) {
          errorMessage += '\n\n💡 **Alternative**: Try creating with Pump.fun instead by saying "create token with pump"';
        } else {
          errorMessage += '\n\n💡 **Alternative**: Try creating with Pump.fun instead by saying "create token with pump"';
        }
        
        console.log('[DEBUG] Bonk error message:', errorMessage);
        return {
          prompt: errorMessage,
          signature: result.signature,
          action: 'error',
          step: null,
          launchId: launchRecord.id
        };
      } else if (result.mint) {
        // Update launch record with success
        await TokenLaunchModel.updateLaunch(launchRecord.id, {
          mintAddress: result.mint,
          transactionSignature: result.signature,
          status: 'completed'
        });

        // Start price tracking for the new token
        setTimeout(async () => {
          try {
            if (result.mint) {
              await tokenPriceTrackingService.getTokenPrice(result.mint);
            }
          } catch (error) {
            console.error('[TokenCreationService] Error starting price tracking:', error);
          }
        }, 5000); // Wait 5 seconds for token to be available

        // We have the mint address
        const successMessage = `🎉 Token created successfully! [View on ${platform}](http://${platform}/coin/${result.mint}) | [View on Solscan](https://solscan.io/token/${result.mint})`;
        console.log('[DEBUG] Bonk success message with mint:', successMessage);
        return {
          prompt: successMessage,
          mint: result.mint,
          action: 'token-creation',
          step: null,
          launchId: launchRecord.id
        };
      } else {
        // Update launch record with pending status
        await TokenLaunchModel.updateLaunch(launchRecord.id, {
          transactionSignature: result.signature,
          status: 'pending'
        });

        // No mint address found, provide transaction signature for manual check
        const successMessage = result.detailedMessage || `🎉 Transaction submitted successfully! Please check the transaction manually:\n\n[View Transaction on Solscan](https://solscan.io/tx/${result.signature})\n\nNote: The token may take a few minutes to appear on Solscan.`;
        console.log('[DEBUG] Bonk success message without mint:', successMessage);
        return {
          prompt: successMessage,
          signature: result.signature,
          action: 'token-creation',
          step: null,
          launchId: launchRecord.id
        };
      }
    }

    // Fallback
    return {
      prompt: 'Token creation initiated. Please check your wallet.',
      mint: result.mint,
      action: 'token-creation',
      step: null,
      launchId: launchRecord.id
    };

    } catch (error: any) {
      // Update launch record with failure (only if record was created)
      if (launchRecord?.id) {
        try {
          await TokenLaunchModel.updateLaunch(launchRecord.id, {
            status: 'failed'
          });
        } catch (updateError) {
          console.error('[TokenCreationService] Failed to update launch record:', updateError);
        }
      }

      console.error('[TokenCreationService] Token creation failed:', error);
      throw error;
    }
  }

  async handleImageUpload(file: Express.Multer.File, context: { userId?: string }) {
    const userId = context.userId || 'default';
    let session = tokenCreationSessions[userId] || { step: 'image' };
    
    // Store the file buffer for later use
    session.imageFile = file;
    session.step = 'twitter';
    tokenCreationSessions[userId] = session;
    
    return {
      prompt: "Great! I've saved your token image. Now, please provide your Twitter link (or type 'skip' to leave blank).",
      step: 'twitter'
    };
  }
} 