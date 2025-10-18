import '../components/chat/ChatMarkdown.css';
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PureMultimodalInput } from "@/components/ui/multimodal-ai-chat-input";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Copy, CheckCircle, AlertTriangle, RefreshCw, Loader2, User, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useWallet as useAppWallet } from '@/context/WalletContext';
import { sendChatMessage } from "@/services/api";
import { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useChatContext } from "@/ChatContext";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { API_BASE_URL } from '@/services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ResearchCard from '@/components/advisor/ResearchCard';
import CompareTable from '@/components/advisor/CompareTable';
import AnswerCard from '@/components/solana/AnswerCard';

const apiUrl = API_BASE_URL;

interface Attachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
}

interface UIMessage {
  id: string;
  content: string;
  role: string;
  attachments?: Attachment[];
  action?: string;
}

// BONK-themed quick command options
const defaultQuickCommands = [
  { label: "🚀 Swap Tokens", action: "swap" },
  { label: "🔥 Launch Token", action: "launch" },
  { label: "📈 Trending Tokens", action: "trending" },
  { label: "💰 My Portfolio", action: "portfolio" },
  { label: "⚡ Proceed", action: "proceed" },
  { label: "🪙 BONK Price", action: "bonk" },
];

// Background ambient dot animation - updated to support both themes
const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#f8fafc,_#f1f5f9)] dark:bg-[radial-gradient(ellipse_at_top_left,_#12121a,_#0a090e)] pointer-events-none transition-colors duration-300">
        {/* Ambient dots */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-orange-500/10 dark:bg-orange-500/5 pointer-events-none"
            style={{
              width: `${Math.random() * 10 + 3}px`,
              height: `${Math.random() * 10 + 3}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 20 + 10}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.3
            }}
          />
        ))}
      </div>

      {/* Subtle glow in top-left */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/20 dark:bg-orange-500/10 blur-[100px] rounded-full pointer-events-none transition-colors duration-300" />

      {/* Secondary glow */}
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-orange-600/10 dark:bg-orange-600/5 blur-[80px] rounded-full pointer-events-none transition-colors duration-300" />
    </div>
  );
};

// TokenRow component for trending tokens and portfolio
const TokenRow = ({ image, symbol, price, solscanUrl, mint, balance, balanceUsd }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="token-row">
      <img src={image} alt={symbol} />
      <div className="token-info">
        <div className="token-symbol">{symbol}</div>
        <div className="token-price">
          ${price} <a href={solscanUrl} target="_blank" rel="noopener noreferrer">View on Solscan</a>
        </div>
        {typeof balance !== 'undefined' && (
          <div className="token-balance">
            <span>Balance: {balance} {symbol}</span>
            {typeof balanceUsd !== 'undefined' && (
              <span className="token-balance-usd"> (${balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</span>
            )}
          </div>
        )}
        <div className="token-mint">
          <span className="mint-address">{mint}</span>
          <button className="copy-btn" onClick={handleCopy} title="Copy mint address">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
};

// QuickResponses component - updated with new color scheme
const QuickResponses = ({ onSend }) => {
  const [userQuickResponses, setUserQuickResponses] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('userQuickResponses');
    return saved ? JSON.parse(saved) : [];
  });
  const [adding, setAdding] = React.useState(false);
  const [newResponse, setNewResponse] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState("");

  React.useEffect(() => {
    localStorage.setItem('userQuickResponses', JSON.stringify(userQuickResponses));
  }, [userQuickResponses]);

  const handleAdd = () => {
    const trimmed = newResponse.trim();
    if (trimmed && !userQuickResponses.includes(trimmed)) {
      setUserQuickResponses([...userQuickResponses, trimmed]);
      setNewResponse("");
      setAdding(false);
    }
  };

  const handleEdit = (index: number) => {
    const trimmed = editingValue.trim();
    if (trimmed && !userQuickResponses.includes(trimmed)) {
      const updated = [...userQuickResponses];
      updated[index] = trimmed;
      setUserQuickResponses(updated);
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleDelete = (index: number) => {
    setUserQuickResponses(userQuickResponses.filter((_, i) => i !== index));
  };

  // Render default quick responses
  const quickButtons = defaultQuickCommands.map((cmd, i) => (
    <button
      key={cmd.action}
      onClick={() => onSend(cmd.label)}
      className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-600/15 border border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white font-medium"
    >
      {cmd.label}
    </button>
  ));

  // Render user quick responses
  const userButtons = userQuickResponses.map((resp, i) => (
    <div key={i} className="flex items-center gap-1">
      {editingIndex === i ? (
        <>
          <input
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            className="quick-edit-input px-3 py-2 rounded-xl border border-orange-500/30 bg-gray-900 text-white text-sm"
            autoFocus
          />
          <button onClick={() => handleEdit(i)} className="text-teal-400 text-xs px-2">Save</button>
          <button onClick={() => setEditingIndex(null)} className="text-gray-400 text-xs px-2">Cancel</button>
        </>
      ) : (
        <>
          <button
            className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-600/15 border border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white font-medium"
            onClick={() => onSend(resp)}
          >
            {resp}
          </button>
          <button
            onClick={() => { setEditingIndex(i); setEditingValue(resp); }}
            className="text-xs text-teal-400 px-1"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDelete(i)}
            className="text-xs text-red-400 px-1"
            title="Delete"
          >
            🗑️
          </button>
        </>
      )}
    </div>
  ));

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {quickButtons}
      {/* Add button as a separate button after all quick responses */}
      {!adding && (
        <button
          type="button"
          className="px-4 py-2 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xl font-bold transition-all"
          onClick={() => setAdding(true)}
          title="Add quick response"
          style={{ minWidth: 40, minHeight: 40, lineHeight: 1 }}
        >
          +
        </button>
      )}
      {userButtons}
      {adding && (
        <div className="flex items-center gap-2">
          <input
            value={newResponse}
            onChange={e => setNewResponse(e.target.value)}
            className="quick-edit-input px-3 py-2 rounded-xl border border-orange-500/30 bg-gray-900 text-white text-sm"
            autoFocus
          />
          <button onClick={handleAdd} className="text-teal-400 text-xs px-2">Add</button>
          <button onClick={() => { setAdding(false); setNewResponse(""); }} className="text-gray-400 text-xs px-2">Cancel</button>
        </div>
      )}
    </div>
  );
};

function useTotalPortfolioBalances(publicKey: string | undefined) {
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalSol, setTotalSol] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
      const tokens = await res.json();
      let usd = 0;
      let sol = 0;
      let solPriceUsd = 0;
      for (const t of tokens) {
        if (t.symbol === 'SOL' && t.price) {
          solPriceUsd = Number(t.price);
          break;
        }
      }
      for (const t of tokens) {
        usd += Number(t.balanceUsd) || 0;
        if (t.symbol === 'SOL') {
          sol += Number(t.balance) || 0;
        } else if (t.price && solPriceUsd) {
          sol += (Number(t.balanceUsd) || 0) / solPriceUsd;
        }
      }
      setTotalUsd(usd);
      setTotalSol(sol);
    } catch (e) {
      setTotalUsd(0);
      setTotalSol(0);
    }
    setLoading(false);
  }, [publicKey]);

  useEffect(() => {
    fetchPortfolio();
  }, [publicKey, fetchPortfolio]);

  return { totalUsd, totalSol, loading, fetchPortfolio };
}

const Chat = () => {
  const { currentMessages: messages, addMessage, resetCurrentChat, chatSessions, currentChatId, startNewChat, loading: chatLoading } = useChatContext();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatId] = useState('main-chat');
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const location = useLocation();
  const { wallet, loading: walletLoading } = useAppWallet();
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | undefined>(undefined);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [unsignedTx, setUnsignedTx] = useState<string | null>(null);
  const [pendingMint, setPendingMint] = useState<string | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeFlow, setActiveFlow] = useState<'swap' | 'token-creation' | null>(null);
  const { collapsed, toggleCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const { totalUsd, totalSol, loading: balancesLoading, fetchPortfolio } = useTotalPortfolioBalances(wallet?.publicKey);

  const handleLogout = () => {
    logout();
    window.location.href = '/auth';
  };

  // Debug logs
  useEffect(() => {
    console.log("Chat component mounted");
    console.log("Current location:", location);

    return () => {
      console.log("Chat component unmounted");
    };
  }, [location]);

  // Automatically focus the chat input after a response is received
  useEffect(() => {
    if (!isGenerating && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isGenerating]);

  // Debug sidebar state
  useEffect(() => {
    console.log("Sidebar visibility state:", showSidebar);
  }, [showSidebar]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Debug: log messages, chatSessions, and currentChatId on each render
  console.log('[Chat.tsx] Render: messages', messages, 'chatSessions', chatSessions, 'currentChatId', currentChatId);

  // Ensure there is always a session
  useEffect(() => {
    if (!chatLoading && chatSessions.length === 0) {
      console.log('[Chat.tsx] No chatSessions found, calling startNewChat');
      startNewChat();
    }
  }, [chatSessions, startNewChat, chatLoading]);

  // Add debug log at the top-level render
  console.log('[RENDER] unsignedTx:', unsignedTx, 'activeFlow:', activeFlow, 'pendingMint:', pendingMint);

  useEffect(() => {
    console.log('[EFFECT] unsignedTx changed:', unsignedTx, 'activeFlow:', activeFlow, 'pendingMint:', pendingMint);
  }, [unsignedTx, activeFlow, pendingMint]);

  const handleSignAndSend = useCallback(async () => {
    if (!unsignedTx || !wallet) return;
    try {
      // Determine type and details
      let type = activeFlow;
      let details = {};
      if (activeFlow === 'token-creation' && pendingMint) {
        details = { mint: pendingMint };
      } else if (activeFlow === 'swap') {
        // Optionally add swap details if needed
      }
      
      // Send to backend for signing and broadcasting using the stored wallet
      const res = await fetch(`${API_BASE_URL}/api/transactions/sign-and-broadcast`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          unsignedTx, 
          walletId: wallet.id,
          type, 
          details 
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to sign and broadcast transaction');
      
      addMessage({
        id: `ai-${Date.now()}`,
        content: result.prompt,
        role: 'assistant',
        action: result.action,
      });
      
      // Refresh balances after success
      fetchPortfolio();
      setUnsignedTx(null);
      setPendingMint(null);
      setActiveFlow(null);
      setIsGenerating(false);
      if (chatInputRef.current) chatInputRef.current.focus();
    } catch (e: any) {
      addMessage({
        id: `ai-${Date.now()}`,
        content: `❌ Failed to sign/send transaction: ${e.message}`,
        role: 'assistant',
        action: 'error',
      });
      setIsGenerating(false);
    }
  }, [unsignedTx, wallet, activeFlow, pendingMint, addMessage, chatInputRef, fetchPortfolio]);

  const handleSendMessage = useCallback(async ({ input, attachments }: { input: string; attachments: Attachment[] }) => {
    if (currentStep === 'image') {
      if (!attachments.length) return;
      const userMessage: UIMessage = {
        id: `user-${Date.now()}`,
        content: '',
        role: 'user',
        attachments: [...attachments],
      };
      addMessage(userMessage);
      setIsGenerating(true);
      try {
        const response = await sendChatMessage('', {
          messages: [...messages, userMessage],
          attachments,
          currentStep,
        });
        console.log('[DEBUG] Backend response (image step):', response);
        if (response.prompt && typeof response.step !== 'undefined') {
          addMessage({
            id: `ai-${Date.now()}`,
            content: response.prompt,
            role: 'assistant',
            action: response.action,
          });
          setCurrentStep(response.step);
        } else if (typeof response.step !== 'undefined') {
          setCurrentStep(response.step);
        } else {
          if (currentStep !== undefined) {
            addMessage({
              id: `ai-${Date.now()}`,
              content: 'Unexpected response, please try again.',
              role: 'assistant',
              action: response.action,
            });
          } else {
            setCurrentStep(undefined);
          }
        }
      } catch (e) {
        addMessage({ id: `err-${Date.now()}`, content: 'Error contacting backend', role: 'assistant', action: 'error' });
      }
      setIsGenerating(false);
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
      return;
    }
    let response = undefined;
    let userMessage: UIMessage | null = null;
    if (currentStep) {
      if (!input.trim()) return;
      userMessage = {
        id: `user-${Date.now()}`,
        content: input,
        role: 'user',
        attachments: attachments.length > 0 ? [...attachments] : undefined,
      };
      addMessage(userMessage);
      setIsGenerating(true);
      try {
        // Create a session if we don't have one
        let sessionId = currentChatId;
        if (!sessionId) {
          console.log('[DEBUG] No current session, creating new one');
          const newSessionResponse = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: 'New Chat' })
          });
          if (newSessionResponse.ok) {
            const newSessionData = await newSessionResponse.json();
            sessionId = newSessionData.session.id;
            console.log('[DEBUG] Created new session:', sessionId);
          }
        }
        
        const payload = {
          messages: [...messages, userMessage],
          currentStep,
          walletAddress: wallet?.publicKey,
        };
        console.log('[DEBUG] Sending chat message:', { input, payload });
        response = await sendChatMessage(input, payload, sessionId);
        console.log('[DEBUG] Backend response:', response);
        console.log('[DEBUG] Adding assistant message with response:', response);
      } catch (e) {
        addMessage({ id: `err-${Date.now()}`, content: 'Error contacting backend', role: 'assistant', action: 'error' });
        setIsGenerating(false);
        if (chatInputRef.current) chatInputRef.current.focus();
        return;
      }
    } else {
      if (!input.trim()) return;
      userMessage = {
        id: `user-${Date.now()}`,
        content: input,
        role: 'user',
        attachments: attachments.length > 0 ? [...attachments] : undefined,
      };
      addMessage(userMessage);
      setIsGenerating(true);
      try {
        // Create a session if we don't have one
        let sessionId = currentChatId;
        if (!sessionId) {
          console.log('[DEBUG] No current session, creating new one');
          const newSessionResponse = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: 'New Chat' })
          });
          if (newSessionResponse.ok) {
            const newSessionData = await newSessionResponse.json();
            sessionId = newSessionData.session.id;
            console.log('[DEBUG] Created new session:', sessionId);
          }
        }
        
        const payload = {
          messages: [...messages, userMessage],
          walletAddress: wallet?.publicKey,
        };
        console.log('[DEBUG] Sending chat message:', { input, payload });
        response = await sendChatMessage(input, payload, sessionId);
        console.log('[DEBUG] Backend response:', response);
      } catch (e) {
        addMessage({ id: `err-${Date.now()}`, content: 'Error contacting backend', role: 'assistant', action: 'error' });
        setIsGenerating(false);
        if (chatInputRef.current) chatInputRef.current.focus();
        return;
      }
    }
    if (response) {
      const unsignedTx = response.unsignedTransaction || response.unsignedTx || response.result?.unsignedTransaction;
      if (unsignedTx) {
        console.log('[DEBUG] Setting unsignedTx:', unsignedTx);
        setUnsignedTx(unsignedTx);
        if (response.action === 'token-creation' || response.result?.action === 'token-creation') {
          console.log('[DEBUG] Setting activeFlow to token-creation');
          setPendingMint(response.mint || response.result?.mint || null);
          setActiveFlow('token-creation');
        } else if (response.swapDetails) {
          console.log('[DEBUG] Setting activeFlow to swap');
          setActiveFlow('swap');
        }
        addMessage({
          id: `ai-${Date.now()}`,
          content: response.prompt || 'Unsigned transaction generated! Please sign with your wallet.',
          role: 'assistant',
          action: response.action,
        });
        setCurrentStep(undefined);
        setIsGenerating(false);
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
        return;
      }
      // Solana Expert intents (transaction explanation, account analysis, SPL questions, etc.)
      if (response?.action === 'solana-expert') {
        addMessage({
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: '',
          action: 'solana-expert',
          expert: response,
        });
        setIsGenerating(false);
        return;
      }
      // Advisor intents (research / compare / buy-sell ideas)
      if (response?.action === 'advisor-research' && response?.advisor?.card) {
        addMessage({
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: '',
          action: 'advisor-research',
          advisor: response.advisor,
          disclaimer: response.disclaimer,
        });
        setIsGenerating(false);
        return;
      }
      if (response?.action === 'advisor-compare' && response?.advisor?.ranked) {
        addMessage({
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: '',
          action: 'advisor-compare',
          advisor: response.advisor,
          disclaimer: response.disclaimer,
        });
        setIsGenerating(false);
        return;
      }
      if (response.action === 'token-creation' || response.action === 'swap') {
        addMessage({
          id: `ai-${Date.now()}`,
          content: response.prompt,
          role: 'assistant',
          action: response.action,
        });
        setCurrentStep(undefined);
        setIsGenerating(false);
        if (chatInputRef.current) {
          chatInputRef.current.focus();
        }
        return;
      }
      if (response.prompt) {
        addMessage({
          id: `ai-${Date.now()}`,
          content: response.prompt,
          role: 'assistant',
          action: response.action,
        });
      }
      if (typeof response.step !== 'undefined') {
        setCurrentStep(response.step);
        console.log('[DEBUG] Updated currentStep:', response.step);
      } else {
        setCurrentStep(undefined);
        console.log('[DEBUG] Updated currentStep: undefined');
      }
    } else {
      // If no response, add a default message
      addMessage({
        id: `ai-${Date.now()}`,
        content: 'Sorry, I didn\'t understand that. Please try again.',
        role: 'assistant',
        action: 'error',
      });
    }
    setIsGenerating(false);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
    return;
  }, [messages, currentStep, wallet]);

  const handleStopGenerating = useCallback(() => {
    console.log("Stopped generating");
    setIsGenerating(false);
  }, []);

  const handleQuickCommand = useCallback((command: string) => {
    console.log("Quick command selected:", command);

    let commandMessage = "";

    switch (command) {
      case "swap":
        commandMessage = "Swap Tokens";
        break;
      case "launch":
        commandMessage = "Launch a meme token";
        break;
      case "trending":
        commandMessage = "Trending tokens";
        break;
      case "portfolio":
        commandMessage = "Show my portfolio";
        break;
      case "proceed":
        commandMessage = "Proceed";
        break;
      default:
        commandMessage = command;
    }

    handleSendMessage({
      input: commandMessage,
      attachments: []
    });
  }, [handleSendMessage]);

  // Wallet is automatically connected via backend

  const handleToggleSidebar = () => {
    console.log("Toggling sidebar from", showSidebar, "to", !showSidebar);
    setShowSidebar(!showSidebar);
  };

  const handleCloseSidebar = useCallback(() => {
    console.log("Closing sidebar from ChatSidebar onClose callback");
    if (isMobile) {
      setShowSidebar(false);
    }
  }, [isMobile]);

  // For responsive design
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(newIsMobile);
      if (newIsMobile) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.log("Rendering Chat component, showSidebar:", showSidebar, "isMobile:", isMobile);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden relative transition-colors duration-300">
      {/* Background with ambient effects */}
      <AmbientBackground />

      {/* Mobile Sidebar Toggle */}
      {isMobile && (
        <button
          onClick={handleToggleSidebar}
          className="fixed top-4 left-4 z-50 rounded-full bg-gray-200/80 dark:bg-slate-800/80 p-2 backdrop-blur-sm"
        >
          <div className="w-6 h-0.5 bg-gray-700 dark:bg-white mb-1"></div>
          <div className="w-6 h-0.5 bg-gray-700 dark:bg-white mb-1"></div>
          <div className="w-6 h-0.5 bg-gray-700 dark:bg-white"></div>
        </button>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: isMobile ? -260 : 0, opacity: isMobile ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed md:relative z-40 md:z-auto h-full pointer-events-auto"
            style={{ width: collapsed ? 64 : 260 }}
          >
            <ChatSidebar
              onClose={handleCloseSidebar}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapsed}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area - Centered relative to the page width */}
      <div className="fixed inset-0 flex justify-center pointer-events-none">
        {/* Offset sidebar space on non-mobile */}
        <div className={cn(
          "hidden md:block",
          showSidebar ? (collapsed ? "w-[64px]" : "w-[260px]") : "w-0"
        )}></div>

        {/* Main content container */}
        <div className="w-full max-w-[720px] flex flex-col h-screen bg-gradient-to-b from-black/5 to-transparent backdrop-blur-sm relative z-10 pointer-events-auto">
          {/* Header with wallet info */}
          <div className="border-b border-orange-500/20 p-6 flex items-center justify-end">
            {walletLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm text-gray-500">Loading wallet...</span>
              </div>
            ) : wallet ? (
              <div className="flex items-center gap-4 bg-gradient-to-r from-orange-500/20 to-orange-600/15 px-4 py-3 rounded-xl border border-orange-500/30 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {wallet.publicKey ? `${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)}` : 'Loading...'}
                  </span>
                  <button
                    onClick={() => {
                      if (wallet.publicKey) {
                        navigator.clipboard.writeText(wallet.publicKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      }
                    }}
                    className="p-1 rounded hover:bg-orange-500/20 transition-colors"
                    title="Copy address"
                  >
                    <Copy size={12} />
                  </button>
                  {copied && <span className="text-xs text-teal-400">Copied!</span>}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-yellow-300">
                    🪙 {totalSol.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-sm font-semibold text-green-300">
                    💵 ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={fetchPortfolio}
                    className="p-1 rounded hover:bg-orange-500/20 transition-colors"
                    title="Refresh balances"
                    disabled={balancesLoading}
                  >
                    {balancesLoading ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                  </button>
                </div>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-orange-500/20 transition-colors">
                      <User size={16} className="text-gray-300" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2 text-sm text-gray-500 border-b">
                      {user?.email || 'User'}
                    </div>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                    >
                      <LogOut className="mr-2" size={16} />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="text-sm text-red-500">
                No wallet found. Please contact support.
              </div>
            )}
          </div>

          {/* Conditional content based on wallet availability */}
          {chatLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                <p className="text-gray-400">Loading chat history...</p>
              </div>
            </div>
          ) : wallet ? (
            <div className="flex-1 flex flex-col overflow-hidden neo-blur">
              {/* Messages area with centered content */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
                <AnimatePresence>
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full text-center gap-6 py-12 relative"
                    >
                      {/* Enhanced BONK-themed glow behind welcome message */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-orange-500/15 to-orange-600/10 rounded-full blur-3xl" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-orange-400/10 to-orange-500/10 rounded-full blur-2xl" />

                      {/* BONK-themed icon with orange glow */}
                                              <div className="relative z-10">
                          <div className="w-28 h-28 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl">
                            <img src="/lovable-uploads/tikka-logo-abstract.png.png" alt="Tikka" className="h-16 w-16" />
                          </div>
                        </div>
                      
                      <h2 className="text-4xl font-bold gradient-text relative z-10">🚀 Welcome to Tikka</h2>
                      <p className="text-gray-700 dark:text-gray-300 max-w-lg relative z-10 text-lg leading-relaxed">
                        Your AI assistant for Solana! Ask me to swap tokens, launch a project, or analyze your portfolio.
                      </p>
                    </motion.div>
                  ) : (
                    messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className={`flex mb-6 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role !== 'user' && (
                          <Avatar className="h-10 w-10 mr-4 mt-1">
                            <img src="/lovable-uploads/tikka-logo-abstract.png.png" alt="Tikka" className="h-full w-full rounded-full" />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">TK</AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                          <div
                            className={cn(
                              "px-6 py-3 rounded-2xl",
                              message.role === 'user'
                                ? "bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                                : "bg-gradient-to-r from-orange-500/40 to-orange-600/30 border border-orange-500/50"
                            )}
                          >
                            {message.role !== 'user' && message.action && (message.action === 'swap' || message.action === 'token-creation') && typeof message.content === 'string' && message.content.includes('View on Solscan') ? (
                              (() => {
                                // Extract the Solscan URL from the markdown link
                                const match = message.content.match(/\[View on Solscan\]\((.*?)\)/);
                                if (match) {
                                  const solscanUrl = match[1];
                                  // Determine label
                                  let label = message.action === 'swap' ? 'Token swapped successfully!' : 'Token created successfully!';
                                  return (
                                    <span>
                                      🎉 {label}{' '}
                                      <a
                                        href={solscanUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-400 underline hover:text-teal-300 transition-colors"
                                      >
                                        View on Solscan
                                      </a>
                                    </span>
                                  );
                                }
                                // fallback to markdown
                                return (
                                  <div className="markdown-body">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeRaw]}
                                      components={{
                                        a: ({node, ...props}) => (
                                          <a
                                            {...props}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 underline hover:text-blue-600 transition-colors"
                                          />
                                        )
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                );
                              })()
                            ) : message.role !== 'user' && typeof message.content === 'string' && message.content.includes('[SOLSCAN_LINK') ? (
                              (() => {
                                // Match [SOLSCAN_LINK]<address>[/SOLSCAN_LINK]
                                const match = message.content.match(/\[SOLSCAN_LINK\](.*?)\[\/SOLSCAN_LINK\]/);
                                if (match) {
                                  const address = match[1];
                                  // Determine action type for correct label
                                  let label = 'Success!';
                                  if (message.content.toLowerCase().includes('swap')) {
                                    label = 'Token swapped successfully!';
                                  } else if (message.content.toLowerCase().includes('created')) {
                                    label = 'Token created successfully!';
                                  }
                                  return (
                                    <span>
                                      🎉 {label}{' '}
                                      <a
                                        href={address.startsWith('http') ? address : `https://solscan.io/${message.content.toLowerCase().includes('swap') ? 'tx' : 'token'}/${address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal-400 underline hover:text-teal-300 transition-colors"
                                      >
                                        View on Solscan
                                      </a>
                                    </span>
                                  );
                                }
                                // fallback to markdown
                                return (
                                  <div className="markdown-body">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeRaw]}
                                      components={{
                                        a: ({node, ...props}) => (
                                          <a
                                            {...props}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 underline hover:text-blue-600 transition-colors"
                                          />
                                        )
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                );
                              })()
                            ) : message.role !== 'user' && Array.isArray(message.content) ? (
                              // Directly render trending tokens as TokenRow components if content is an array
                              message.content.map((token, idx) => (
                                <TokenRow
                                  key={token.mint || idx}
                                  image={token.image}
                                  symbol={token.symbol}
                                  price={token.price}
                                  solscanUrl={token.solscanUrl}
                                  mint={token.mint}
                                  balance={token.balance}
                                  balanceUsd={token.balanceUsd}
                                />
                              ))
                            ) : message.role !== 'user' && typeof message.content === 'string' && message.content.startsWith('{"prompt": [') ? (
                              // Parse and render trending tokens as TokenRow components (legacy JSON string)
                              (() => {
                                try {
                                  const parsed = JSON.parse(message.content);
                                  if (parsed.prompt && Array.isArray(parsed.prompt)) {
                                    return parsed.prompt.map((token, idx) => (
                                      <TokenRow
                                        key={token.mint || idx}
                                        image={token.image}
                                        symbol={token.symbol}
                                        price={token.price}
                                        solscanUrl={token.solscanUrl}
                                        mint={token.mint}
                                        balance={token.balance}
                                        balanceUsd={token.balanceUsd}
                                      />
                                    ));
                                  }
                                } catch (e) { }
                                // fallback to markdown if not a trending tokens list
                                return (
                                  <div className="markdown-body">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeRaw]}
                                      components={{
                                        a: ({node, ...props}) => (
                                          <a
                                            {...props}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 underline hover:text-blue-600 transition-colors"
                                          />
                                        )
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                );
                              })()
                            ) : message.role === 'assistant' && message.action === 'solana-expert' ? (
                              <AnswerCard data={message.expert} />
                            ) : message.role === 'assistant' && message.action === 'advisor-research' && message.advisor?.card ? (
                              <ResearchCard card={message.advisor.card} disclaimer={message.disclaimer} />
                            ) : message.role === 'assistant' && message.action === 'advisor-compare' && message.advisor?.ranked ? (
                              <CompareTable ranked={message.advisor.ranked} buys={message.advisor.buys} sells={message.advisor.sells} disclaimer={message.disclaimer} />
                            ) : message.role !== 'user' ? (
                              <div className="markdown-body">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    a: ({node, ...props}) => (
                                      <a
                                        {...props}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 underline hover:text-blue-600 transition-colors"
                                      />
                                    )
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            )}

                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.attachments.map((attachment) => (
                                  <Badge
                                    key={attachment.url}
                                    className="bg-gray-800 text-gray-300 border border-gray-600"
                                  >
                                    {attachment.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div
                            className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'
                              }`}
                          >
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {message.role === 'user' && (
                          <Avatar className="h-8 w-8 ml-3 mt-1 order-2">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-gray-700 text-gray-300">U</AvatarFallback>
                          </Avatar>
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>

                {/* Typing indicator */}
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-gray-400 mb-4"
                  >
                                          <Avatar className="h-8 w-8">
                        <img src="/lovable-uploads/tikka-logo-abstract.png.png" alt="Tikka" className="h-full w-full rounded-full" />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">TK</AvatarFallback>
                      </Avatar>
                    <div className="flex px-4 py-3 bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-2xl border border-orange-500/20">
                      <span className="animate-pulse mr-1 text-orange-400">●</span>
                      <span className="animate-pulse animation-delay-200 mr-1 text-orange-400">●</span>
                      <span className="animate-pulse animation-delay-400 text-orange-400">●</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Quick commands - only show when messages exist */}
              {messages.length > 0 && (
                <div className="px-4 pt-2">
                  <QuickResponses onSend={input => handleSendMessage({ input, attachments: [] })} />
                </div>
              )}

              {/* Input area */}
              <div className="p-4">
                <PureMultimodalInput
                  chatId={chatId}
                  messages={messages}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  onSendMessage={handleSendMessage}
                  onStopGenerating={handleStopGenerating}
                  isGenerating={isGenerating}
                  canSend={true}
                  selectedVisibilityType="private"
                  className="bg-gray-900 border-orange-500/20 focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/20"
                  currentStep={currentStep}
                  inputRef={chatInputRef}
                />
              </div>
            </div>
          ) : (
            /* Loading or Error State */
            <div className="flex-1 flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center w-full px-6 py-8 relative"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl">
                  <img src="/lovable-uploads/tikka-logo-abstract.png.png" alt="Tikka" className="h-20 w-20" />
                </div>
                <h2 className="text-3xl font-bold gradient-text mb-4">Loading...</h2>
                <p className="text-gray-700 dark:text-gray-300 text-lg">
                  Setting up your wallet...
                </p>
              </motion.div>
            </div>
          )}
          {/* Show sign transaction button if unsignedTx is present */}
          {unsignedTx && (
            <div className="p-8 rounded-3xl border-2 border-orange-500/30 bg-gradient-to-r from-orange-500/20 to-orange-600/15 shadow-xl flex flex-col items-center max-w-xl mx-auto my-6 relative">
              <button
                onClick={async () => {
                  setUnsignedTx(null);
                  setPendingMint(null);
                  // Send 'cancel' to backend if user closes the signature prompt
                  if (wallet) {
                    try {
                      const response = await sendChatMessage('cancel', {
                        walletAddress: wallet.publicKey,
                        currentStep,
                        activeFlow,
                      });
                      addMessage({
                        id: `ai-${Date.now()}`,
                        content: response.prompt || response.message || (activeFlow === 'token-creation' ? 'Token creation cancelled.' : 'Swap cancelled.'),
                        role: 'assistant',
                        action: response.action,
                      });
                      setCurrentStep(undefined);
                      setActiveFlow(null);
                      setIsGenerating(false);
                    } catch (e) {
                      addMessage({
                        id: `ai-${Date.now()}`,
                        content: 'Error cancelling flow.',
                        role: 'assistant',
                        action: 'error',
                      });
                      setIsGenerating(false);
                    }
                  }
                  if (chatInputRef.current) {
                    chatInputRef.current.focus();
                  }
                }}
                className="absolute top-3 right-3 text-teal-400 hover:text-orange-400 text-xl font-bold focus:outline-none p-2 rounded-lg hover:bg-gray-800/50 transition-all"
                title="Close"
              >
                ×
              </button>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-orange-400" size={28} />
                <span className="text-xl font-bold text-orange-400">Signature Required</span>
              </div>
              <div className="text-base text-white mb-6 text-center leading-relaxed">
                A transaction needs your signature to complete token creation.<br />
                Please sign with your connected wallet to continue.
              </div>
              <Button
                onClick={handleSignAndSend}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all"
              >
                <CheckCircle className="mr-2" size={18} /> Sign Transaction
              </Button>
              {pendingMint && (
                <div className="mt-4 text-xs text-teal-400 bg-gray-800/50 px-3 py-2 rounded-lg">
                  Mint: {pendingMint}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
