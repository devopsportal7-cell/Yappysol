import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Rocket, LogOut, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { name: "Features", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "FAQ", href: "#faq" },
  ];

  const handleLaunchApp = () => {
    if (isAuthenticated) {
      navigate('/chat');
    } else {
      navigate('/auth');
    }
  };

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(href);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.05)]'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left side */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <span className="text-2xl font-bold text-white">Tikka</span>
          </motion.div>


          {/* Right side - Version badge and buttons */}
          <div className="flex items-center gap-6">
            {/* Version Badge */}
            <div className="hidden md:block text-[#A0A0A0] text-sm">
              Version 2.0 is LIVE! You're on it.
            </div>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-transparent border border-white text-white hover:bg-white/10 px-4 py-2 text-sm"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user?.email?.split('@')[0] || 'User'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#111111] border border-[rgba(255,255,255,0.1)]">
                  <DropdownMenuItem
                    onClick={() => navigate('/chat')}
                    className="text-white hover:bg-white/5"
                  >
                    Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="text-white hover:bg-white/5"
                  >
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-400 hover:bg-red-400/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="bg-transparent border border-white text-white hover:bg-white/10 px-4 py-2 text-sm"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Documentation
                </Button>
                <Button
                  onClick={handleLaunchApp}
                  className="bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110 font-medium px-4 py-2 text-sm"
                >
                  Start Trading
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-[#F6C945] transition-colors duration-200"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-[rgba(255,255,255,0.05)] bg-black/95 backdrop-blur-md"
          >
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className="block w-full text-left text-[#A0A0A0] hover:text-white transition-colors duration-200 font-medium py-2"
                >
                  {item.name}
                </button>
              ))}
              
              <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <div className="text-[#A0A0A0] text-sm mb-4 text-center">
                  Version 2.0 is LIVE! You're on it.
                </div>
                
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        navigate('/chat');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110"
                    >
                      Chat
                    </Button>
                    <Button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full bg-transparent border border-white text-white hover:bg-white/10"
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full bg-transparent border border-white text-white hover:bg-white/10"
                    >
                      Documentation
                    </Button>
                    <Button
                      onClick={() => {
                        handleLaunchApp();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110"
                    >
                      Start Trading
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;