import { ChatContext, SwapSession } from '../types/chat';
import { setSwapSession, getSwapSession, clearSwapSession } from '../lib/redis';

export async function handleSwapStep(
  session: SwapSession,
  input: string,
  userId: string
): Promise<{ response: string; step?: string; unsignedTransaction?: string; requireSignature?: boolean; swapDetails?: any }> {
  const { step } = session;

  switch (step) {
    case 'fromToken':
      // Validate token input
      if (!input || input.length < 2) {
        return {
          response: 'Please provide a valid token contract address or ticker.',
          step: 'fromToken'
        };
      }

      session.fromToken = input;
      session.step = 'toToken';
      await setSwapSession(userId, session);
      return {
        response: 'Which token do you want to swap to? (contract address or ticker)',
        step: 'toToken'
      };

    case 'toToken':
      // Validate token input
      if (!input || input.length < 2) {
        return {
          response: 'Please provide a valid token contract address or ticker.',
          step: 'toToken'
        };
      }

      // Check if trying to swap to the same token
      if (input.toLowerCase() === session.fromToken?.toLowerCase()) {
        return {
          response: 'You cannot swap to the same token. Please choose a different token.',
          step: 'toToken'
        };
      }

      session.toToken = input;
      session.step = 'amount';
      await setSwapSession(userId, session);
      return {
        response: 'How much would you like to swap? (Enter the amount)',
        step: 'amount'
      };

    case 'amount':
      const amount = parseFloat(input);
      if (isNaN(amount) || amount <= 0) {
        return {
          response: 'Please provide a valid amount greater than 0.',
          step: 'amount'
        };
      }

      session.amount = amount;
      session.step = 'confirmation';
      session.awaitingConfirmation = true;
      await setSwapSession(userId, session);

      const summary = `
🔄 **Swap Summary**
-----------------------------
**From:** ${session.fromToken}
**To:** ${session.toToken}
**Amount:** ${session.amount}
-----------------------------

Type 'proceed' to perform the swap or 'cancel' to start over.`;

      return {
        response: summary,
        step: 'confirmation',
        requireSignature: false,
        swapDetails: {
          fromToken: session.fromToken,
          toToken: session.toToken,
          amount: session.amount
        }
      };

    case 'confirmation':
      if (input.toLowerCase() === 'proceed') {
        try {
          const result = await executeSwap(session, userId);
          await clearSwapSession(userId);
          return {
            response: 'Swap transaction created! Please sign and submit the transaction.',
            unsignedTransaction: result.unsignedTransaction || result.unsignedTx,
            requireSignature: true,
            swapDetails: result.swapDetails
          };
        } catch (error) {
          console.error('Error executing swap:', error);
          return {
            response: 'Failed to execute swap. Please try again.',
            step: 'confirmation'
          };
        }
      } else if (input.toLowerCase() === 'cancel') {
        await clearSwapSession(userId);
        return {
          response: 'Swap cancelled. You can start over by typing "swap".'
        };
      } else {
        return {
          response: 'Please type "proceed" to perform the swap or "cancel" to start over.',
          step: 'confirmation'
        };
      }

    default:
      return {
        response: 'Something went wrong. Please start over by typing "swap".'
      };
  }
}

async function executeSwap(session: SwapSession, userId: string) {
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  let action, mint, denominatedInSol;
  
  if (session.fromToken === SOL_MINT) {
    action = 'buy';
    mint = session.toToken;
    denominatedInSol = true;
  } else if (session.toToken === SOL_MINT) {
    action = 'sell';
    mint = session.fromToken;
    denominatedInSol = false;
  } else {
    throw new Error('Only SOL <-> token swaps are supported at this time.');
  }

  const swapRequest = {
    publicKey: userId,
    action,
    mint,
    denominatedInSol: denominatedInSol.toString(),
    amount: session.amount,
    slippage: 0.5,
    priorityFee: 0,
    pool: 'auto',
  };

  const response = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(swapRequest)
  });

  if (!response.ok) {
    throw new Error('Failed to execute swap');
  }

  const contentType = response.headers.get('content-type');
  const buffer = await response.arrayBuffer();
  const text = Buffer.from(buffer).toString('utf-8');

  if (contentType && contentType.includes('application/json')) {
    const result = JSON.parse(text);
    if (result.error) {
      throw new Error(result.error);
    }
    return {
      unsignedTx: result.unsignedTx,
      swapDetails: swapRequest
    };
  } else {
    return {
      unsignedTransaction: Buffer.from(buffer).toString('base64'),
      swapDetails: swapRequest
    };
  }
} 