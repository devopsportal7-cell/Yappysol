import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

interface NavItem {
  name: string;
  url: string;
  icon?: any;
  external?: boolean;
  target?: string;
  rel?: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, navItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  if (!isOpen) return null;
  
  const handleItemClick = (item: NavItem) => {
    if (item.url.startsWith('#')) {
      // Handle scroll to section
      const element = document.querySelector(item.url);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Handle navigation
      navigate(item.url);
    }
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Container */}
              <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] glass-card border-l border-orange-500/20">
        <div className="flex flex-col h-full">
          {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b border-orange-500/20">
            <h2 className="text-xl font-bold gradient-text">Menu</h2>
        <button
          onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-orange-500/10 rounded-xl transition-all duration-300 hover:scale-110"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
          </div>
          
          {/* Navigation Items */}
          <nav className="flex-1 p-6">
            <div className="space-y-4">
              {navItems.map((item, index) => (
                <button
                key={item.name}
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center gap-4 p-4 text-left text-lg font-medium text-gray-300 hover:text-white hover:bg-orange-500/10 rounded-xl transition-all duration-300 hover:scale-105 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {item.icon && (
                    <item.icon 
                      size={24} 
                      className="text-orange-400 group-hover:text-orange-300 transition-colors duration-300"
                    />
                  )}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </nav>
          
          {/* Footer */}
          <div className="p-6 border-t border-orange-500/20">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                Powered by AI • Built on Solana
              </p>
              <div className="flex justify-center space-x-4">
                <a 
                  href="https://twitter.com/soltikka" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 transition-colors duration-300"
              >
                  Twitter
                </a>
                <a 
                  href="https://docs.tikka.fun" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 transition-colors duration-300"
              >
                  Docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
