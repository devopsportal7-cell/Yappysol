# Soltikka Advisor Mode Implementation Documentation

**Project:** Soltikka - Solana AI Copilot  
**Feature:** Advisor Mode for Token Research and Comparison  
**Implementation Date:** December 19, 2024  
**Status:** ✅ Completed and Ready for Testing

---

## Overview

The Advisor Mode feature adds powerful token research and comparison capabilities to the Soltikka platform. It provides users with AI-powered investment insights, token analysis, and buy/sell recommendations while maintaining educational disclaimers and ensuring no automatic transaction execution.

## Key Features Implemented

### 1. Token Research
- **Command:** "Give analysis on JTO" or "Research SOL"
- **Output:** Detailed research card with composite scoring (0-100)
- **Data:** Price, 24h change, liquidity, transaction volume, risk assessment

### 2. Token Comparison
- **Command:** "Compare SOL vs JUP vs BONK" or "Which is better: SOL or BONK?"
- **Output:** Ranked comparison table with buy/sell recommendations
- **Features:** Multi-token analysis with scoring and risk profiling

### 3. Investment Guidance
- **Command:** "What should I buy or sell today?" or "Give me investment ideas"
- **Output:** Potential buys and sells based on risk profile
- **Risk Profiles:** Conservative, Balanced, Aggressive (auto-detected)

### 4. Risk Profiling
- **Auto-detection:** Analyzes user language for risk preferences
- **Conservative:** "safe", "low risk", "stable"
- **Aggressive:** "degen", "high risk", "moon"
- **Balanced:** Default profile

---

## Technical Implementation

### Backend Architecture

#### Files Created:
1. **`backend/src/services/AdvisorIntent.ts`**
   - Intent classification using regex patterns
   - Symbol and mint address extraction
   - Risk profile inference
   - Query type detection (research, compare, buy/sell)

2. **`backend/src/analytics/scoring.ts`**
   - Composite scoring algorithm (0-100)
   - Risk-weighted scoring based on profile
   - Factors: Momentum, Liquidity, Activity
   - Normalization and weighting functions

3. **`backend/src/services/AdvisorService.ts`**
   - Main service orchestrating research and comparison
   - Integration with existing TokenPriceService and TrendingService
   - Data aggregation and scoring
   - Result formatting and note generation

#### Files Modified:
1. **`backend/src/services/ChatService.ts`**
   - Added advisor routing hooks
   - Intent classification integration
   - Response formatting for advisor actions

### Frontend Architecture

#### Files Created:
1. **`frontend/src/components/advisor/ResearchCard.tsx`**
   - Individual token research display
   - Responsive grid layout
   - Gradient scoring indicator
   - Real-time data formatting

2. **`frontend/src/components/advisor/CompareTable.tsx`**
   - Multi-token comparison table
   - Buy/sell recommendations section
   - Responsive design with mobile support

#### Files Modified:
1. **`frontend/src/pages/Chat.tsx`**
   - Added advisor component imports
   - Advisor response handling
   - Component rendering logic

2. **`frontend/src/types/chat.ts`**
   - Added advisor type definitions
   - Research and comparison payload types

---

## Data Sources and APIs

### Existing APIs Used:
1. **Moralis API** (`MORALIS_API_KEY`)
   - Token price data
   - 24h price changes
   - Metadata information

2. **DexScreener API** (Public, no auth required)
   - Trending tokens data
   - Liquidity information
   - Transaction volume data

### Hardcoded Data:
- Common token addresses (SOL, USDC, USDT, BONK, JUP, JTO)
- Scoring algorithms and risk weights
- Intent classification patterns

---

## Scoring Algorithm

### Composite Score Calculation (0-100):
```
Score = (Momentum × W_mom) + (Liquidity × W_liq) + (Activity × W_act)
```

### Risk Profile Weights:
- **Conservative:** Momentum(25%) + Liquidity(55%) + Activity(20%)
- **Balanced:** Momentum(40%) + Liquidity(35%) + Activity(25%)
- **Aggressive:** Momentum(55%) + Liquidity(20%) + Activity(25%)

### Factor Normalization:
- **Momentum:** -50% to +150% → 0-1
- **Liquidity:** $0 to $200K → 0-1
- **Activity:** 0 to 10K transactions → 0-1

---

## Safety and Compliance

### Educational Disclaimers:
- All outputs include: "Educational market research, not financial advice"
- No automatic transaction execution
- Informational purposes only

### Risk Management:
- Transparent scoring methodology
- Clear risk profile indicators
- Warning notes for low liquidity or negative momentum

### Data Integrity:
- Real-time data fetching
- Error handling for API failures
- Graceful degradation when data unavailable

---

## Environment Variables

### Required (Existing):
```bash
MORALIS_API_KEY=your_moralis_key          # Token price data
HELIUS_API_KEY=your_helius_key            # Solana blockchain data
SUPABASE_URL=your_supabase_url            # Database connection
SUPABASE_ANON_KEY=your_supabase_anon_key  # Database auth
SUPABASE_SERVICE_ROLE_KEY=your_service_key # Database admin
OPENAI_API_KEY=your_openai_key            # AI chat functionality
```

### No New Environment Variables Required!

---

## Database Changes

### No New Tables Required!
- **Stateless Design:** All data fetched in real-time
- **No Persistence:** Results not stored in database
- **Existing Tables:** Uses current user, wallet, chat, and API key tables

---

## Testing Commands

### Token Research:
```
"Give analysis on JTO"
"Research SOL token"
"Tell me about BONK"
"Deep dive into JUP"
```

### Token Comparison:
```
"Compare SOL vs JUP vs BONK"
"Which is better: SOL or BONK?"
"Rank these tokens: SOL, JUP, JTO"
"Top 3 tokens to compare"
```

### Investment Guidance:
```
"What should I buy or sell today?"
"Give me investment ideas"
"What to buy today? Conservative profile"
"Investment recommendations for aggressive trading"
```

---

## Implementation Status

### ✅ Completed:
- [x] Backend intent classification
- [x] Scoring algorithm implementation
- [x] Service integration
- [x] Frontend components
- [x] Chat integration
- [x] Type definitions
- [x] Build verification
- [x] No linting errors

### ✅ Testing Verified:
- [x] Backend builds successfully
- [x] Frontend builds successfully
- [x] Development servers running
- [x] No TypeScript errors
- [x] All existing functionality preserved

---

## File Structure

```
tikka/
├── backend/src/
│   ├── services/
│   │   ├── AdvisorIntent.ts          # NEW - Intent classification
│   │   ├── AdvisorService.ts         # NEW - Main advisor service
│   │   └── ChatService.ts            # MODIFIED - Added advisor hooks
│   └── analytics/
│       └── scoring.ts                # NEW - Scoring algorithm
└── frontend/src/
    ├── components/advisor/
    │   ├── ResearchCard.tsx          # NEW - Research display
    │   └── CompareTable.tsx          # NEW - Comparison table
    ├── pages/
    │   └── Chat.tsx                  # MODIFIED - Advisor rendering
    └── types/
        └── chat.ts                   # MODIFIED - Advisor types
```

---

## Key Implementation Details

### Intent Classification Patterns:
```typescript
// Research patterns
/(analysis|research|deep dive|explain)/

// Comparison patterns  
/(compare|vs|versus|top|best|rank|which|buy|sell|hold)/

// Buy/sell patterns
/should i (buy|sell)|what to (buy|sell)/
```

### Symbol Extraction:
```typescript
// Token symbols (2-10 characters)
/\b[A-Z0-9]{2,10}\b/g

// Solana mint addresses (32-44 characters)
/[1-9A-HJ-NP-Za-km-z]{32,44}/g
```

### Risk Profile Detection:
```typescript
// Conservative: "safe", "low risk", "stable"
// Aggressive: "degen", "high risk", "moon"  
// Balanced: Default profile
```

---

## Future Enhancements

### Potential Improvements:
1. **Caching:** Add Redis for frequently requested token data
2. **Historical Data:** Store and analyze historical performance
3. **Portfolio Integration:** Connect with user's existing portfolio
4. **Advanced Analytics:** Technical indicators and chart patterns
5. **Custom Alerts:** Price and volume alerts for tracked tokens

### Scalability Considerations:
1. **Rate Limiting:** Implement API rate limiting
2. **Data Aggregation:** Batch API requests for efficiency
3. **Caching Strategy:** Cache popular token data
4. **Error Recovery:** Enhanced error handling and retry logic

---

## Deployment Notes

### Production Readiness:
- ✅ No breaking changes to existing functionality
- ✅ Additive implementation only
- ✅ Proper error handling
- ✅ Educational disclaimers included
- ✅ No database migrations required
- ✅ No new environment variables needed

### Monitoring:
- Monitor API usage for Moralis and DexScreener
- Track user engagement with advisor features
- Monitor error rates and performance
- Validate disclaimer compliance

---

**Implementation Completed:** December 19, 2024  
**Ready for Production:** ✅ Yes  
**Breaking Changes:** ❌ None  
**Database Changes:** ❌ None Required  
**Environment Changes:** ❌ None Required

---

*This documentation provides a complete overview of the Advisor Mode implementation for future reference and maintenance.*
