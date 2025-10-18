
import React from "react";
import { Zap, Leaf, Building2 } from "lucide-react";

const TrustMetrics = () => {
  const metrics = [
    {
      icon: <Zap className="w-8 h-8" />,
      value: "65K+",
      label: "TPS handled",
      description: "Lightning-fast transactions"
    },
    {
      icon: <Leaf className="w-8 h-8" />,
      value: "$0.00025",
      label: "avg fee",
      description: "Ultra-low transaction costs"
    },
    {
      icon: <Building2 className="w-8 h-8" />,
      value: "10K+",
      label: "smart chats processed",
      description: "AI-powered conversations"
    }
  ];

  return (
    <section className="py-32 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 gradient-text">
            Trust & Performance
        </h2>
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Built on Solana's lightning-fast infrastructure with enterprise-grade reliability and security.
        </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {metrics.map((metric, index) => (
              <div key={index} className="neo-card p-10 lg:p-12 rounded-3xl hover:scale-105 transition-all duration-500 group">
                <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                  <div className="text-white">
                    {metric.icon}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-5xl md:text-7xl font-bold gradient-text mb-4">
                    {metric.value}
                  </div>
                  <div className="text-xl md:text-2xl font-semibold text-white mb-4">
                    {metric.label}
              </div>
                  <div className="text-gray-300 text-lg md:text-xl">
                    {metric.description}
                  </div>
                </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </section>
  );
};

export default TrustMetrics;
