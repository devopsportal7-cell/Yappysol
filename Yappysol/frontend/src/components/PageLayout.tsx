import React from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import { motion } from "framer-motion";
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Wallet, Copy, User, LogOut, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  hideScrollbar?: boolean;
  pageTitle?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, maxWidth, hideScrollbar = false, pageTitle }) => {
  const { wallet, loading: walletLoading } = useWallet();
  const { user, logout } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const maxWClass = maxWidth ? maxWidth : "max-w-[720px]";
  const scrollClass = hideScrollbar ? "hide-scrollbar" : "";

  const handleLogout = () => {
    logout();
    window.location.href = '/auth';
  };

  return (
    <div className={`h-screen bg-chatta-darker text-white overflow-hidden flex ${collapsed ? 'justify-center' : ''}`}>
      {/* Sidebar */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="z-40 h-full pointer-events-auto"
        style={{ width: collapsed ? '64px' : '260px' }}
      >
        <ChatSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
      </motion.div>
      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center">
        <div className={`w-full ${maxWClass} flex flex-col h-full bg-gradient-to-b from-black/5 to-transparent backdrop-blur-sm relative z-10 overflow-auto pointer-events-auto`}>
          {/* Top bar: page title (left) and wallet info + user menu (right) */}
          <div className="border-b border-chatta-purple/10 py-2 px-4 flex items-center justify-between">
            <div className="text-xl font-bold text-white/80 tracking-wide">
              {pageTitle}
            </div>
            {/* Combined Wallet Info + User Menu */}
            {walletLoading ? (
              <div className="flex items-center gap-2 bg-chatta-purple/10 px-3 py-1 rounded-full border border-chatta-purple/20">
                <Loader2 className="animate-spin" size={14} />
                <span className="text-sm text-gray-300">Loading wallet...</span>
              </div>
            ) : wallet ? (
              <div className="flex items-center gap-2 bg-chatta-purple/10 px-3 py-1 rounded-full border border-chatta-purple/20">
                <div className="w-2 h-2 rounded-full bg-chatta-cyan"></div>
                <span className="text-sm text-gray-300 flex items-center gap-1">
                  {wallet.publicKey ? `${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)}` : "Loading..."}
                  <button
                    onClick={() => {
                      if (wallet.publicKey) {
                        navigator.clipboard.writeText(wallet.publicKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      }
                    }}
                    className="ml-1 p-1 rounded hover:bg-chatta-purple/20 transition-colors"
                    title="Copy address"
                  >
                    <Copy size={14} />
                  </button>
                  {copied && <span className="ml-1 text-xs text-green-400">Copied!</span>}
                </span>
                <span className="text-xs text-gray-400">
                  {wallet.balance?.toFixed(4) || '0'} SOL
                </span>
                <span className="text-xs text-gray-400">
                  ${(wallet.balance || 0).toFixed(2)}
                </span>
                <button
                  onClick={() => window.location.reload()}
                  className="ml-1 p-1 rounded hover:bg-chatta-purple/20 transition-colors"
                  title="Refresh"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-2 p-1 rounded hover:bg-chatta-purple/20 transition-colors">
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
              <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-red-300">No wallet found</span>
              </div>
            )}
          </div>
          {/* Main content */}
          <div className={`flex-1 overflow-y-auto ${hideScrollbar ? "hide-scrollbar" : ""}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLayout; 