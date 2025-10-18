import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const BuiltDifferentSection = () => {
  const features = [
    {
      icon: "chat",
      title: "Chat-First by Design",
      description: "Not a dashboard. Not a wallet. Just you and your AI.",
      mockup: { value: "Pure Chat", change: "No UI", changeColor: "text-green-400" }
    },
    {
      icon: "blocks",
      title: "Composable & Open",
      description: "Plug Tikka into your bots, apps, or workflows.",
      mockup: { value: "API Ready", change: "Open", changeColor: "text-blue-400" }
    },
    {
      icon: "mobile",
      title: "Mobile-Ready",
      description: "No installs. Works beautifully from your browser.",
      mockup: { value: "Browser App", change: "Mobile", changeColor: "text-purple-400" }
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      chat: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      blocks: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      mobile: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
            Built Different
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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

export default BuiltDifferentSection;






