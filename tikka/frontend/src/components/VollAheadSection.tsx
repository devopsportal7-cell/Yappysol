import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const trustFeatures = [
  {
    icon: "brain",
    title: "Trained on Solana",
    description: "Understands your wallet, coins, and past behavior.",
    mockup: { value: "Wallet Analysis", change: "Active", changeColor: "text-green-400" }
  },
  {
    icon: "lock",
    title: "Privacy-First",
    description: "No chat history. No creep. You control what's seen.",
    mockup: { value: "Private Mode", change: "On", changeColor: "text-blue-400" }
  },
  {
    icon: "lightning",
    title: "Fast by Default",
    description: "Faster than dashboards. Faster than your DEX.",
    mockup: { value: "Instant Swap", change: "0.2s", changeColor: "text-green-400" }
  }
];

const VollAheadSection = () => {
  const getIcon = (iconName: string) => {
    const icons = {
      brain: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      lock: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      lightning: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    };
    return icons[iconName as keyof typeof icons];
  };

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Trust Built In
          </h2>
        </div>

        {/* Features Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {trustFeatures.map((feature, index) => (
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

export default VollAheadSection;