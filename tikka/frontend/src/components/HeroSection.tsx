import React from "react";
import { Button } from "@/components/ui/button";
import TradingInterfaceMockup from "./TradingInterfaceMockup";
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();


  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-24 overflow-hidden">

      {/* Hero Content - Layered above background */}
      <div className="container mx-auto max-w-6xl flex flex-col items-center justify-center text-center relative z-10">
        {/* Main Headline */}
        <h1 className="text-[48px] lg:text-[60px] font-bold leading-[0.9] text-white mb-8 font-stencil max-w-2xl mx-auto">
          DeFi just got chatty.
        </h1>

        {/* Subheadline */}
        <p className="text-[16px] lg:text-[20px] text-white mb-16 leading-[1.2] max-w-3xl mx-auto font-space font-light">
          Alpha, swaps, tokens, even coin launches - just ask. Tikka handles the rest.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-row gap-6 justify-center mb-24">
          <Button
            variant="outline"
            className="bg-transparent border border-white text-white hover:bg-white/10 px-6 py-3 text-[16px] font-medium rounded-lg transition-all duration-300"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Documentation
          </Button>
          <Button
            className="bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110 px-6 py-3 text-[16px] font-medium rounded-lg transition-all duration-300"
            onClick={() => navigate('/chat')}
          >
            Start Trading
          </Button>
        </div>
        
        {/* Main Trading Interface Mockup */}
        <div className="w-full max-w-6xl">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] rounded-3xl blur-3xl opacity-20 scale-105"></div>
            
            {/* Trading Interface Container */}
            <div className="relative bg-[#0a0a0a] rounded-3xl overflow-hidden shadow-[0px_25px_80px_rgba(0,0,0,0.9)] border border-[rgba(255,255,255,0.08)]">
              {/* Interface Header */}
              <div className="bg-[#111111] border-b border-[rgba(255,255,255,0.08)] px-8 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-[#A0A0A0] text-sm font-mono">Tikka Trading Interface</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {/* Main Interface Content */}
              <div className="p-8">
                <TradingInterfaceMockup />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;