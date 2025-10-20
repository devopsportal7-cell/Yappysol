import Moralis from 'moralis';
import config from '../config';

class MoralisService {
  private static instance: MoralisService;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): MoralisService {
    if (!MoralisService.instance) {
      MoralisService.instance = new MoralisService();
    }
    return MoralisService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        await Moralis.start({
          apiKey: config.MORALIS_API_KEY
        });
        this.isInitialized = true;
        console.log('Moralis initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Moralis:', error);
        this.isInitialized = false;
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  public getMoralis(): typeof Moralis {
    if (!this.isInitialized) {
      throw new Error('Moralis not initialized. Call initialize() first.');
    }
    return Moralis;
  }
}

// Export singleton instance
export const moralisService = MoralisService.getInstance();

// Export convenience functions
export const initMoralis = () => moralisService.initialize();
export const getMoralis = () => moralisService.getMoralis();

export default Moralis; 