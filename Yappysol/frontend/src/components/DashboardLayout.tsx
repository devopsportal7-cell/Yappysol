import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  History, 
  Settings, 
  PanelLeft, 
  User, 
  LogOut, 
  Copy,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, pageTitle }) => {
  const { wallet, loading: walletLoading } = useWallet();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCopy = () => {
    if (wallet?.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const navItems = [
    { 
      icon: MessageSquare, 
      label: 'Dashboard', 
      route: '/chat',
      active: location.pathname === '/chat'
    },
    { 
      icon: MessageSquare, 
      label: 'Chat', 
      route: '/chat',
      active: location.pathname === '/chat'
    },
    { 
      icon: History, 
      label: 'History', 
      route: '/history',
      active: location.pathname === '/history'
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      route: '/settings',
      active: location.pathname === '/settings'
    },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-pink-50/20 dark:from-slate-900 dark:via-orange-900/20 dark:to-pink-900/20 flex overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: 0, width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-orange-200/50 dark:border-orange-800/50 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-orange-200/50 dark:border-orange-800/50">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigate('/chat')}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-200">
                  <img src="/lovable-uploads/tikka-logo-text.png.png" alt="Tikka" className="h-8 w-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tikka</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Solana AI</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div 
                className="flex items-center justify-center cursor-pointer group"
                onClick={() => navigate('/chat')}
              >
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-200">
                  <img src="/lovable-uploads/tikka-logo-text.png.png" alt="Tikka" className="h-6 w-8 object-contain" />
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.route}>
                <Button
                  variant={item.active ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-12',
                    item.active 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                  )}
                  onClick={() => navigate(item.route)}
                >
                  <item.icon className="h-5 w-5" />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-orange-200/50 dark:border-orange-800/50">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  <User className="h-5 w-5" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
                    <p className="text-xs text-gray-500">Account</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 text-sm text-gray-500 border-b">
                    {user?.email || 'User'}
                  </div>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-orange-200/50 dark:border-orange-800/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {pageTitle || 'Dashboard'}
              </h1>
            </div>

            {/* Wallet Info */}
            <div className="flex items-center gap-4">
              {walletLoading ? (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800">
                  <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Loading wallet...</span>
                </div>
              ) : wallet ? (
                <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-full border border-orange-200 dark:border-orange-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {wallet.publicKey ? `${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)}` : "Loading..."}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 w-6 p-0 hover:bg-orange-100 dark:hover:bg-orange-800/30"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {copied && <span className="text-xs text-green-600">Copied!</span>}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {wallet.balance?.toFixed(4) || '0'} SOL
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="h-6 w-6 p-0 hover:bg-orange-100 dark:hover:bg-orange-800/30"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200 dark:border-red-800">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-600 dark:text-red-400">No wallet connected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;

