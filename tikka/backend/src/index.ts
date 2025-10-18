import app from './app';
import { initMoralis } from './lib/moralis';
import { PrivyAuthService } from './services/PrivyAuthService';

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await initMoralis();
    
    // Initialize Privy authentication
    PrivyAuthService.initialize();
    
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
      console.log(`Privy authentication: ${PrivyAuthService.isPrivyConfigured() ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
})(); 