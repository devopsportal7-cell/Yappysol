import fetch from 'node-fetch';

export class MoralisTestService {
  async getTokenPrice(mint: string): Promise<any> {
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) {
      throw new Error('Moralis API key not set on server');
    }
    const url = `https://solana-gateway.moralis.io/token/mainnet/${mint}/price`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      } as any,
    });
    if (!response.ok) {
      throw new Error(`Moralis error: ${response.status}`);
    }
    return await response.json();
  }
} 