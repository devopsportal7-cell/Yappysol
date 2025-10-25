# External Wallet Deposit Balance System - Environment Variables for Doppler

## Required Environment Variables

### Helius API Configuration (Solana WebSocket)
```
HELIUS_API_KEY=your_helius_api_key_here
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_WSS_URL=wss://api.helius.xyz/v0/websocket
```

### Database Configuration (Supabase)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Performance Tuning
```
PORTFOLIO_CONCURRENCY=6
WALLET_REFRESH_DEBOUNCE_MS=800
IMMEDIATE_REFRESH_MS=100
BACKGROUND_UPDATE_INTERVAL_MS=30000
BACKGROUND_BALANCE_UPDATE=false
```

### Service Control
```
BACKGROUND_BALANCE_UPDATE=false
```
**Note**: Set to `false` to disable background balance updates and avoid rate limits. When disabled, balance updates will only occur on-demand via API calls or WebSocket notifications.

### Logging Configuration
```
LOG_LEVEL=info
NODE_ENV=production
```

### Wallet Encryption (if not already set)
```
WALLET_ENCRYPTION_KEY=your_wallet_encryption_key_here
```

### CORS Configuration
```
FRONTEND_BASE_URL=https://your-frontend-domain.com,https://your-staging-domain.com
```

## Optional Environment Variables

### Cache Configuration
```
CACHE_VALIDITY_MINUTES=5
MAX_CACHE_SIZE=1000
```

### WebSocket Configuration
```
WSS_MAX_RECONNECT_ATTEMPTS=10
WSS_RECONNECT_DELAY_MS=5000
```

### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Environment-Specific Configurations

### Development
```
NODE_ENV=development
LOG_LEVEL=debug
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_WSS_URL=wss://api.helius.xyz/v0/websocket
FRONTEND_BASE_URL=http://localhost:3000
```

### Staging
```
NODE_ENV=staging
LOG_LEVEL=info
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_WSS_URL=wss://api.helius.xyz/v0/websocket
FRONTEND_BASE_URL=https://your-staging-domain.com
```

### Production
```
NODE_ENV=production
LOG_LEVEL=warn
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_WSS_URL=wss://api.helius.xyz/v0/websocket
FRONTEND_BASE_URL=https://your-production-domain.com
```

## Security Notes

1. **HELIUS_API_KEY**: Get this from your Helius dashboard
2. **SUPABASE_SERVICE_ROLE_KEY**: Use this for backend operations (bypasses RLS)
3. **WALLET_ENCRYPTION_KEY**: Should be a strong, random 32-character string
4. **FRONTEND_BASE_URL**: Comma-separated list of allowed origins

## Setup Instructions for Doppler

1. **Create a new Doppler project** for your backend
2. **Add all required environment variables** from the list above
3. **Set environment-specific values** for development, staging, and production
4. **Configure secrets** for sensitive values like API keys
5. **Test the configuration** by running the backend locally

## Verification Checklist

- [ ] HELIUS_API_KEY is valid and has sufficient quota
- [ ] SUPABASE credentials are correct and have proper permissions
- [ ] WALLET_ENCRYPTION_KEY is set and secure
- [ ] FRONTEND_BASE_URL includes all necessary domains
- [ ] Performance tuning values are appropriate for your scale
- [ ] Logging level is appropriate for each environment

## Monitoring Recommendations

Set up monitoring for these key metrics:
- External transaction detection time
- Balance update latency
- Cache hit rate
- API error rate
- WebSocket connection health
- Background service performance
