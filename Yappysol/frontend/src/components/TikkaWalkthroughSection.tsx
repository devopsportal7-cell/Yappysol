import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const YappysolWalkthroughSection = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      number: 1,
      title: "Login with Privy",
      description: "Sign up with Telegram, Google, or Wallet. No seed phrase. Instant access.",
      mockup: {
        label: "Privy Login Screen",
        image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
        description: "Clean login interface with multiple auth options"
      }
    },
    {
      number: 2,
      title: "Ask Anything",
      description: "Swap tokens, track wallets, launch coins — just type it. Yappysol understands.",
      mockup: {
        label: "Chat Interface",
        image: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
        description: "Chat with message 'Swap 1 SOL to BONK'"
      }
    },
    {
      number: 3,
      title: "One-Tap Confirm",
      description: "Readable summary. Sign and go. No clutter, no confusion.",
      mockup: {
        label: "Transaction Confirmation",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
        description: "One-tap transaction confirmation window"
      }
    }
  ];

  // Auto-rotate through steps every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % 3) + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: "easeOut" } 
    },
  };

  const mockupVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  return (
    <section id="yappysol-walkthrough" className="py-24 md:py-32 bg-[#0C0C0C] overflow-hidden">
      <div className="container max-w-7xl mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center"
        >
          {/* Headline */}
          <motion.h2 
            variants={itemVariants}
            className="text-[42px] md:text-[48px] font-bold text-white mb-6 leading-tight"
          >
            Your Solana AI Copilot — in one Chat.
          </motion.h2>

          {/* Subtext */}
          <motion.p 
            variants={itemVariants}
            className="text-[18px] md:text-[20px] text-[#A0A0A0] mb-16 max-w-3xl mx-auto leading-relaxed"
          >
            From wallet login to token launch — everything starts with a message.
          </motion.p>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-16">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className={`cursor-pointer transition-all duration-300 ${
                  activeStep === step.number 
                    ? 'transform scale-105' 
                    : 'hover:transform hover:scale-102'
                }`}
                onClick={() => setActiveStep(step.number)}
              >
                {/* Step Number */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-4 mx-auto transition-all duration-300 ${
                  activeStep === step.number
                    ? 'bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black'
                    : 'bg-[#111111] text-[#A0A0A0] border border-[rgba(255,255,255,0.05)]'
                }`}>
                  {step.number}
                </div>

                {/* Step Title */}
                <h3 className={`text-[18px] font-bold mb-3 transition-colors duration-300 ${
                  activeStep === step.number ? 'text-white' : 'text-[#A0A0A0]'
                }`}>
                  {step.title}
                </h3>

                {/* Step Description */}
                <p className="text-[14px] text-[#A0A0A0] leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Desktop Mockup Frame */}
          <motion.div 
            variants={itemVariants}
            className="relative max-w-4xl mx-auto"
          >
            {/* Mockup Container */}
            <div className="relative bg-[#111111] rounded-2xl p-4 shadow-2xl border border-[rgba(255,255,255,0.05)]">
              {/* Browser-like Header */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-[#A0A0A0] text-sm font-mono ml-4">
                  Yappysol - Step {activeStep}
                </div>
              </div>

              {/* Animated Mockup Content */}
              <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    variants={mockupVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute inset-0"
                  >
                    <div
                      className="w-full h-full bg-cover bg-center rounded-lg"
                      style={{
                        backgroundImage: `url(${steps[activeStep - 1].mockup.image})`,
                      }}
                    />
                    
                    {/* Overlay with step info */}
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4">
                      <h4 className="text-white font-semibold text-sm mb-1">
                        {steps[activeStep - 1].mockup.label}
                      </h4>
                      <p className="text-[#A0A0A0] text-xs">
                        {steps[activeStep - 1].mockup.description}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveStep(index + 1)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    activeStep === index + 1
                      ? 'bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] scale-125'
                      : 'bg-[#333333] hover:bg-[#555555]'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative gradient line */}
      <div
        className="absolute w-full h-px bottom-0 left-0"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(246,201,69,0.24) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
    </section>
  );
};

export default YappysolWalkthroughSection;





