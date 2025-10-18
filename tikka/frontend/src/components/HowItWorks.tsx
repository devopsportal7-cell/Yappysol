import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const HowItWorks = () => {
  const features = [
    {
      icon: "sparkle",
      title: "Understands Your Vibe",
      description: "Say \"track BONK\" or \"send $10\" — Tikka gets it."
    },
    {
      icon: "tools", 
      title: "Backed by Solana Tools",
      description: "Integrates with Jupiter, Pump.fun, Helius, Dialect, SolanaFM."
    },
    {
      icon: "check",
      title: "One-Tap Confirmations",
      description: "Readable summaries. No confusing txns."
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      sparkle: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      tools: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      check: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
    return icons[iconName as keyof typeof icons];
  };

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Intent-Aware Intelligence
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-yellow-400 rounded-2xl flex items-center justify-center">
                {getIcon(feature.icon)}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            className="bg-transparent border border-white text-white hover:bg-white/10 px-8 py-3 text-lg font-medium rounded-lg transition-all duration-300"
          >
            Launch Chat
          </Button>
          <Button
            className="bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110 px-8 py-3 text-lg font-medium rounded-lg transition-all duration-300"
          >
            See Docs
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;