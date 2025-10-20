import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const LightFastSection = () => {
  const features = [
    {
      icon: "sun",
      title: "Now in Light Mode",
      description: "Bright, readable, and easy on the eyes.",
      mockup: { value: "Light Theme", change: "Active", changeColor: "text-yellow-400" }
    },
    {
      icon: "minimal",
      title: "Minimal UX. Max Output.",
      description: "Swap. Launch. Track. Without 5 tabs open.",
      mockup: { value: "One Interface", change: "All Tools", changeColor: "text-green-400" }
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      sun: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      minimal: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
            Light & Fast
          </h2>
        </div>

        {/* Features Grid */}
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

export default LightFastSection;







