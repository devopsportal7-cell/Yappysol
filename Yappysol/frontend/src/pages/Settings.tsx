import React, { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, ChevronDown, Trash2, Download, Languages, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from '@/context/WalletContext';
import { useTheme } from "@/context/ThemeContext";

// Background ambient dot animation - updated to support both themes
const AmbientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#f8fafc,_#f1f5f9)] dark:bg-[radial-gradient(ellipse_at_top_left,_#12121a,_#0a090e)] transition-colors duration-300">
        {/* Ambient dots */}
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-orange-500/10 dark:bg-orange-500/5"
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
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/20 dark:bg-orange-500/10 blur-[100px] rounded-full transition-colors duration-300" />
      
      {/* Secondary glow */}
      <div className="absolute top-1/3 right-0 w-72 h-72 bg-orange-600/10 dark:bg-orange-600/5 blur-[80px] rounded-full transition-colors duration-300" />
    </div>
  );
};

const Settings = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { wallet, loading: walletLoading, error: walletError } = useWallet();
  const { theme, setTheme } = useTheme();
  const [showImportWallet, setShowImportWallet] = useState(false);
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [settings, setSettings] = useState({
    responseDetail: "balanced",
    tone: "professional",
    showCommandPreviews: true,
    fontSize: "medium",
    language: "English",
    saveChats: true,
    useHistory: true,
    tokenAlerts: true,
    swapConfirmations: true
  });
  
  // Handle setting changes
  const handleSettingChange = (setting: string, value: any) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };
  
  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  // Handle wallet import
  const handleImportWallet = async () => {
    if (!importPrivateKey.trim()) return;
    
    setIsImporting(true);
    try {
      const response = await fetch('/api/auth/import-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ privateKey: importPrivateKey.trim() })
      });

      if (response.ok) {
        setImportPrivateKey('');
        setShowImportWallet(false);
        // Refresh wallet data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to import wallet: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      alert('Failed to import wallet. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };
  
  // For responsive design
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="p-6">
        <div className="space-y-8">
          {/* Wallet & Account Section */}
          <Card className="neo-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Wallet & Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {walletLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                  <span className="text-sm text-gray-500">Loading wallet...</span>
                </div>
              ) : wallet ? (
                <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Default Wallet</p>
                  <p className="font-medium text-lg text-gray-900 dark:text-white">
                        {wallet.publicKey ? `${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)}` : "Loading..."}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Balance: {wallet.balance?.toFixed(4) || '0'} SOL
                  </p>
                </div>
                    <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="default"
                        onClick={() => setShowImportWallet(!showImportWallet)}
                    className="border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                  >
                        <Wallet className="mr-2" size={16} />
                        Import Wallet
                  </Button>
                    </div>
                  </div>

                  {/* Import Wallet Form */}
                  {showImportWallet && (
                    <div className="border border-orange-500/20 rounded-lg p-4 bg-orange-500/5">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Import Existing Wallet</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Enter your private key (base58 format)"
                          value={importPrivateKey}
                          onChange={(e) => setImportPrivateKey(e.target.value)}
                          className="w-full px-3 py-2 border border-orange-500/30 rounded-lg bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        />
                        <div className="flex gap-2">
                  <Button
                            onClick={handleImportWallet}
                            disabled={!importPrivateKey.trim() || isImporting}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                          >
                            {isImporting ? 'Importing...' : 'Import Wallet'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowImportWallet(false);
                              setImportPrivateKey('');
                            }}
                            className="border-orange-500/30 hover:bg-orange-500/10"
                          >
                            Cancel
                  </Button>
                        </div>
                      </div>
                    </div>
                )}
              </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No wallet found</p>
                  <p className="text-sm text-gray-400">Please contact support if you believe this is an error.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* AI Preferences Section */}
          <Card className="neo-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">AI Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Response Detail Level</p>
                <ToggleGroup 
                  type="single" 
                  value={settings.responseDetail}
                  onValueChange={(value) => value && handleSettingChange('responseDetail', value)}
                  className="justify-start"
                >
                  <ToggleGroupItem 
                    value="compact" 
                    className={`rounded-xl px-6 py-2 transition-all ${
                      settings.responseDetail === "compact" 
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg" 
                        : "bg-transparent border border-orange-500/30 hover:bg-orange-500/10"
                    }`}
                  >
                    Compact
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="balanced" 
                    className={`rounded-xl px-6 py-2 transition-all ${
                      settings.responseDetail === "balanced" 
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg" 
                        : "bg-transparent border border-orange-500/30 hover:bg-orange-500/10"
                    }`}
                  >
                    Balanced
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="verbose" 
                    className={`rounded-xl px-6 py-2 transition-all ${
                      settings.responseDetail === "verbose" 
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg" 
                        : "bg-transparent border border-orange-500/30 hover:bg-orange-500/10"
                    }`}
                  >
                    Verbose
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tone</p>
                <ToggleGroup 
                  type="single" 
                  value={settings.tone}
                  onValueChange={(value) => value && handleSettingChange('tone', value)}
                  className="justify-start"
                >
                  <ToggleGroupItem 
                    value="professional" 
                    className={`rounded-xl px-6 py-2 transition-all ${
                      settings.tone === "professional" 
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg" 
                        : "bg-transparent border border-orange-500/30 hover:bg-orange-500/10"
                    }`}
                  >
                    Professional
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="casual" 
                    className={`rounded-xl px-6 py-2 transition-all ${
                      settings.tone === "casual" 
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg" 
                        : "bg-transparent border border-orange-500/30 hover:bg-orange-500/10"
                    }`}
                  >
                    Casual
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="meme" 
                    className={`rounded-xl px-6 py-2 transition-all ${
                      settings.tone === "meme" 
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg" 
                        : "bg-transparent border border-orange-500/30 hover:bg-orange-500/10"
                    }`}
                  >
                    Meme Mode 😎
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              <div className="flex items-center space-x-3">
                <Switch 
                  id="command-previews"
                  checked={settings.showCommandPreviews}
                  onCheckedChange={(checked) => 
                    handleSettingChange('showCommandPreviews', checked)
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500"
                />
                <label 
                  htmlFor="command-previews" 
                  className="text-sm cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                >
                  Show command previews
                </label>
              </div>
            </CardContent>
          </Card>
          
          {/* Interface Section */}
          <Card className="neo-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Interface</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 font-medium text-gray-700 dark:text-gray-300">
                  <Moon size={18} className="text-gray-500 dark:text-gray-400" />
                  <span>Theme</span>
                </span>
                <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/30 rounded-xl p-1 flex">
                  <button 
                    className={`rounded-lg p-2 transition-all ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <Moon size={16} />
                  </button>
                  <button 
                    className={`rounded-lg p-2 transition-all ${
                      theme === 'light' 
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <Sun size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Font Size</span>
                <div className="flex items-center border border-orange-500/30 rounded-xl overflow-hidden">
                  <button 
                    className={`px-4 py-2 transition-all ${
                      settings.fontSize === 'small' 
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-orange-500/10'
                    }`}
                    onClick={() => handleSettingChange('fontSize', 'small')}
                  >
                    S
                  </button>
                  <button 
                    className={`px-4 py-2 transition-all ${
                      settings.fontSize === 'medium' 
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-orange-500/10'
                    }`}
                    onClick={() => handleSettingChange('fontSize', 'medium')}
                  >
                    M
                  </button>
                  <button 
                    className={`px-4 py-2 transition-all ${
                      settings.fontSize === 'large' 
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-orange-500/10'
                    }`}
                    onClick={() => handleSettingChange('fontSize', 'large')}
                  >
                    L
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 font-medium text-gray-700 dark:text-gray-300">
                  <Languages size={18} className="text-gray-500 dark:text-gray-400" />
                  <span>Language</span>
                </span>
                <button 
                  className="flex items-center gap-2 bg-transparent border border-orange-500/30 rounded-xl px-4 py-2 text-sm hover:bg-orange-500/10 transition-all"
                >
                  {settings.language}
                  <ChevronDown size={14} />
                </button>
              </div>
            </CardContent>
          </Card>
          
          {/* Privacy & History Section */}
          <Card className="neo-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Privacy & History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3">
                <Switch 
                  id="save-chats"
                  checked={settings.saveChats}
                  onCheckedChange={(checked) => 
                    handleSettingChange('saveChats', checked)
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500"
                />
                <label 
                  htmlFor="save-chats" 
                  className="text-sm cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                >
                  Save chat history
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Switch 
                  id="use-history"
                  checked={settings.useHistory}
                  onCheckedChange={(checked) => 
                    handleSettingChange('useHistory', checked)
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500"
                />
                <label 
                  htmlFor="use-history" 
                  className="text-sm cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                >
                  Use history for smarter replies
                </label>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Button 
                  variant="outline"
                  size="default"
                  className="gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                >
                  <Trash2 size={16} />
                  Clear History
                </Button>
                
                <Button 
                  variant="outline"
                  size="default"
                  className="gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                >
                  <Download size={16} />
                  Export My Data
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Notifications Section */}
          <Card className="neo-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3">
                <Switch 
                  id="token-alerts"
                  checked={settings.tokenAlerts}
                  onCheckedChange={(checked) => 
                    handleSettingChange('tokenAlerts', checked)
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500"
                />
                <label 
                  htmlFor="token-alerts" 
                  className="text-sm cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                >
                  Token price alerts
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Switch 
                  id="swap-confirmations"
                  checked={settings.swapConfirmations}
                  onCheckedChange={(checked) => 
                    handleSettingChange('swapConfirmations', checked)
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-pink-500"
                />
                <label 
                  htmlFor="swap-confirmations" 
                  className="text-sm cursor-pointer font-medium"
                >
                  Swap confirmations
                </label>
              </div>
            </CardContent>
          </Card>
          
          {/* About / Support Section */}
          <Card className="neo-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-bold">About / Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 font-medium">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              
              <Separator className="bg-orange-500/20" />
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="outline"
                  size="default"
                  className="border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                >
                  Documentation
                </Button>
                
                <Button 
                  variant="outline"
                  size="default"
                  className="gap-2 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                >
                  <AlertCircle size={16} />
                  Report Bug
                </Button>
                
                <Button 
                  variant="outline"
                  size="default"
                  className="border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
