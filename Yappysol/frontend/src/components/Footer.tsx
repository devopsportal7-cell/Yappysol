import React from "react";
import { motion } from "framer-motion";
import { Github, Twitter, MessageCircle, ArrowRight, Globe, Moon, Settings, User } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-black border-t border-[rgba(255,255,255,0.05)]">
      <div className="container mx-auto max-w-7xl px-4 py-16">
        {/* Sticky Footer Tagline */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Built on Solana. Trained on vibes.
            </h3>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Yappysol is the AI copilot for crypto conversations.
            </p>
          </motion.div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-[28px] font-bold text-white mb-4">
                Yappysol
              </h3>
              <p className="text-[16px] text-[#A0A0A0] leading-[1.6] max-w-md">
                Your command line for Solana, powered by AI. Trade, launch, and manage your portfolio through intuitive chat commands.
              </p>
            </div>
            
            {/* CTA */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black px-6 py-3 rounded-lg font-medium hover:brightness-110 transition-all duration-300"
              >
                <span>Launch Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-[18px] font-medium text-white mb-6">Navigation</h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="#"
                  className="text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
                >
                  Terms & conditions
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
                >
                  Sitemap
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
                >
                  Apply for
                </a>
              </li>
            </ul>
          </div>

          {/* Utility Icons */}
          <div>
            <h4 className="text-[18px] font-medium text-white mb-6">Tools</h4>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
              >
                <Globe className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
              >
                <Moon className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#A0A0A0] hover:text-[#F6C945] transition-colors duration-200"
              >
                <User className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-[rgba(255,255,255,0.05)]">
          <div className="text-center">
            <p className="text-[12px] text-[#A0A0A0] leading-relaxed max-w-4xl mx-auto">
              This website and its contents are provided for informational purposes only. Tikka is not a financial advisor, 
              investment advisor, or broker-dealer. All trading and investment activities involve risk. Past performance 
              does not guarantee future results. Please conduct your own research and consult with a qualified financial 
              advisor before making any investment decisions. Tikka is not responsible for any losses or damages arising 
              from the use of this platform or reliance on any information provided herein. By using this platform, 
              you acknowledge and agree to these terms and conditions.
            </p>
            <p className="text-[14px] text-[#A0A0A0] mt-4">
              © 2024 Tikka. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;