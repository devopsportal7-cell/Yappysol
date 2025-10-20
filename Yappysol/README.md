# 🚀 Yappysol - Solana AI Copilot

**Yappysol** is an AI-powered Solana assistant that enables users to perform DeFi operations through natural language conversations. Built with React, TypeScript, and Node.js, it provides an intuitive chat interface for token creation, swapping, portfolio management, and more.

![Yappysol Logo](frontend/public/lovable-uploads/yappysol-logo-abstract.png.png)

## ✨ Features

### 🤖 AI-Powered Chat Interface
- **Natural Language Processing**: Interact with DeFi protocols using plain English
- **Multi-step Flows**: Guided token creation and swapping processes
- **Context Awareness**: Maintains conversation context across interactions
- **Image Upload Support**: Upload token images during creation

### 💰 DeFi Operations
- **Token Creation**: Create SPL tokens with custom metadata
- **Token Swapping**: Swap between different tokens seamlessly
- **Portfolio Tracking**: Monitor your token holdings and performance
- **Transaction History**: View detailed transaction records
- **Trending Tokens**: Discover popular and trending tokens

### 🔐 Wallet Management
- **Auto-Creation**: Automatic wallet generation on registration
- **Import Support**: Import existing Solana wallets
- **Secure Storage**: Encrypted private key storage
- **Multi-Wallet Support**: Manage multiple wallets

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Theme**: Customizable appearance
- **Real-time Updates**: Live balance and price updates
- **Intuitive Navigation**: Easy-to-use interface

## 🏗️ Architecture

### Frontend (`/frontend`)
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** components
- **React Router** for navigation
- **Context API** for state management

### Backend (`/backend`)
- **Node.js** with Express
- **TypeScript** for type safety
- **Supabase** for database
- **JWT** authentication
- **OpenAI API** for AI responses
- **Solana Web3.js** for blockchain interactions

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Doppler account (for environment variables)
- Supabase account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/devopsportal7-cell/Yappysol.git
   cd Yappysol
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**
   
   Create a Doppler project and add the following variables:
   ```bash
   # Backend (.env)
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openai_api_key
   MORALIS_API_KEY=your_moralis_api_key
   DEXSCREENER_API_KEY=your_dexscreener_api_key
   HELIUS_API_KEY=your_helius_api_key
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_KEY=your_pinata_secret_key
   
   # Frontend (.env)
   VITE_API_BASE_URL=http://localhost:3001
   ```

4. **Set up the database**
   
   Run the Supabase schema:
   ```sql
   -- Execute the SQL in backend/supabase-schema.sql
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   doppler run -- npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   doppler run -- npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
Yappysol/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── auth.ts     # Authentication routes
│   │   │   ├── chat.ts     # Chat and AI routes
│   │   │   ├── transactions.ts # Transaction history
│   │   │   └── ...
│   │   ├── services/       # Business logic
│   │   │   ├── ChatService.ts
│   │   │   ├── TokenCreationService.ts
│   │   │   ├── TokenSwapService.ts
│   │   │   └── ...
│   │   ├── models/         # Data models
│   │   │   ├── UserSupabase.ts
│   │   │   ├── WalletSupabase.ts
│   │   │   └── ...
│   │   └── lib/           # Utilities
│   ├── supabase-schema.sql # Database schema
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── chat/      # Chat-related components
│   │   │   ├── ui/        # Reusable UI components
│   │   │   └── ...
│   │   ├── pages/         # Page components
│   │   │   ├── Chat.tsx   # Main chat interface
│   │   │   ├── Auth.tsx   # Authentication
│   │   │   ├── History.tsx # Transaction history
│   │   │   └── ...
│   │   ├── context/       # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── WalletContext.tsx
│   │   │   └── ...
│   │   └── services/      # API services
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/wallets` - Get user wallets

### Chat & AI
- `POST /api/chat/message` - Send chat message
- `POST /api/chat/token-creation` - Upload token image
- `GET /api/chat/sessions` - Get chat sessions

### Transactions
- `GET /api/transactions` - Get transaction history
- `GET /api/portfolio` - Get portfolio data

## 🎯 Usage Examples

### Token Creation
```
User: "I want to create a new token"
AI: "Great! Let's create your token. First, please upload an image for your token."
User: [Uploads image]
AI: "Perfect! Now, what would you like to name your token?"
User: "MyAwesomeToken"
AI: "Excellent! What symbol should it have? (e.g., MAT)"
...
```

### Token Swapping
```
User: "I want to swap SOL for USDC"
AI: "I'll help you swap SOL for USDC. How much SOL would you like to swap?"
User: "1 SOL"
AI: "Perfect! The current rate is 1 SOL = 95.2 USDC. Proceed with the swap?"
...
```

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev:doppler  # Start with Doppler environment
npm run build        # Build TypeScript
npm start           # Start production server
```

### Frontend Development
```bash
cd frontend
npm run dev:doppler  # Start with Doppler environment
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
# Test services
cd frontend
npm run test:services
```

## 🔒 Security

- **JWT Authentication**: Secure user sessions
- **Encrypted Storage**: Private keys are encrypted before storage
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: API endpoints are rate-limited
- **CORS Protection**: Cross-origin requests are properly configured

## 🌐 Deployment

### Backend Deployment
1. Build the project: `npm run build`
2. Set environment variables in your hosting platform
3. Deploy the `dist/` folder

### Frontend Deployment
1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your hosting platform
3. Update `VITE_API_BASE_URL` to your backend URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Solana](https://solana.com/) - The blockchain platform
- [OpenAI](https://openai.com/) - AI capabilities
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact us at [your-email@example.com]
- Join our Discord community

---

**Built with ❤️ for the Solana ecosystem**
