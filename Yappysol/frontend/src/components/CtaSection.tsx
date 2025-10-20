import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";

const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-black">
      <div className="container mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] opacity-5 blur-3xl rounded-full"></div>
          
          <div className="relative">
            {/* Headline */}
            <h2 className="text-[48px] lg:text-[64px] font-bold text-white mb-6 leading-[1.2]">
              Ready to revolutionize your Solana experience?
            </h2>
            
            {/* Subheadline */}
            <p className="text-[18px] text-[#A0A0A0] mb-12 max-w-2xl mx-auto leading-[1.6]">
              Join thousands of users who are already trading, launching, and managing their portfolios through AI-powered chat.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                className="bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110 px-8 py-4 text-[18px] font-medium rounded-lg transition-all duration-300 shadow-[0px_4px_12px_rgba(246,201,69,0.3)]"
                onClick={() => navigate('/chat')}
              >
                <Play className="w-5 h-5 mr-2" />
                Start Chatting Now
              </Button>
              
              <Button
                variant="outline"
                className="bg-transparent border border-[rgba(255,255,255,0.15)] text-white hover:bg-white/5 px-8 py-4 text-[18px] font-medium rounded-lg transition-all duration-300"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-16 pt-8 border-t border-[rgba(255,255,255,0.05)]">
              <p className="text-[14px] text-[#A0A0A0] mb-4">
                Trusted by Solana builders worldwide
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                <div className="text-[#F6C945] font-bold">Jupiter</div>
                <div className="text-[#F6C945] font-bold">Pump.fun</div>
                <div className="text-[#F6C945] font-bold">DexScreener</div>
                <div className="text-[#F6C945] font-bold">Moralis</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaSection;