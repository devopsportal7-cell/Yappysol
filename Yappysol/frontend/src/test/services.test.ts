import { ServiceRouter, ServiceType } from '../services/ServiceRouter';

async function testServices() {
  try {
    const router = ServiceRouter.getInstance();
    console.log('Testing all services...\n');

    // Test Chat Service
    console.log('Testing Chat Service...');
    const chatResponse = await router.routeRequest(ServiceType.CHAT, {
      message: "What's the current price of SOL?",
      userId: "test_user_123"
    });
    console.log('Chat Response:', JSON.stringify(chatResponse, null, 2), '\n');

    // Test Token Price Service
    console.log('Testing Token Price Service...');
    const priceResponse = await router.routeRequest(ServiceType.TOKEN_PRICE, {
      tokenAddress: "So11111111111111111111111111111111111111112" // SOL token address
    });
    console.log('Token Price Response:', JSON.stringify(priceResponse, null, 2), '\n');

    // Test Token Creation Service
    console.log('Testing Token Creation Service...');
    const creationResponse = await router.routeRequest(ServiceType.TOKEN_CREATION, {
      name: "Test Token",
      symbol: "TEST",
      decimals: 9,
      supply: 1000000,
      metadata: {
        description: "A test token created for demonstration"
      }
    });
    console.log('Token Creation Response:', JSON.stringify(creationResponse, null, 2), '\n');

    // Test Token Swap Service
    console.log('Testing Token Swap Service...');
    const swapResponse = await router.routeRequest(ServiceType.TOKEN_SWAP, {
      fromToken: "So11111111111111111111111111111111111111112", // SOL
      toToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      amount: 1,
      slippage: 1
    });
    console.log('Token Swap Response:', JSON.stringify(swapResponse, null, 2), '\n');

    // Test Trending Service
    console.log('Testing Trending Service...');
    const trendingResponse = await router.routeRequest(ServiceType.TRENDING, {
      timeframe: "24h",
      limit: 5
    });
    console.log('Trending Response:', JSON.stringify(trendingResponse, null, 2), '\n');

  } catch (error) {
    console.error('Error testing services:', error);
  }
}

// Run the tests
testServices(); 