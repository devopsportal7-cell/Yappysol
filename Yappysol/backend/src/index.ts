import app from './app';
import { initMoralis } from './lib/moralis';
import { PrivyAuthService } from './services/PrivyAuthService';
import http from 'http';

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await initMoralis();
    
    // Initialize Privy authentication
    PrivyAuthService.initialize();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Attach WebSocket server to HTTP server
    const { frontendWebSocketServer } = await import('./services/FrontendWebSocketServer');
    frontendWebSocketServer.attachToServer(server);
    console.log('✅ WebSocket server attached to HTTP server');
    
    server.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
      console.log(`WebSocket server available at wss://your-domain.onrender.com/ws`);
      console.log(`Privy authentication: ${PrivyAuthService.isPrivyConfigured() ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
})(); 