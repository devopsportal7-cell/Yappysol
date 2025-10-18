import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const features = [
  {
    icon: "message",
    title: "One Message. One Action.",
    description: "Swap tokens, launch coins, track alpha — just by typing.",
    mockup: { value: "swap SOL for USDC", change: "✓ Done", changeColor: "text-green-400" }
  },
  {
    icon: "chat",
    title: "Chat Interface First",
    description: "Familiar. Minimal. Blazingly fast.",
    mockup: { value: "launch token BONK", change: "→ Created", changeColor: "text-blue-400" }
  }
];

const FeaturesGrid = () => {
  const getIcon = (iconName: string) => {
    const icons = {
      message: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      chat: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    };
    return icons[iconName as keyof typeof icons];
  };

  return (
    <section id="features" className="py-24 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Less UI. More Tikka.
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Tikka isn't just a bot. It's your Solana copilot.
          </p>
        </div>

        {/* Features Grid - 2x2 Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="bg-gray-900/50 border-gray-800 hover:border-yellow-400/30 transition-all duration-300 p-8 rounded-2xl">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                      {getIcon(feature.icon)}
                    </div>
                    {/* Mini mockup */}
                    <div className="bg-gray-800 rounded-lg p-3 text-xs">
                      <div className="text-white font-medium">{feature.mockup.value}</div>
                      <div className={`${feature.mockup.changeColor} text-xs`}>{feature.mockup.change}</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;