import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const SmartRoutinesSection = () => {
  const routines = [
    {
      icon: "computer",
      title: "Set It & Forget It",
      description: "Coming soon: Alpha alerts, automated swaps, scheduled buys — all via chat.",
      mockup: { value: "Auto-Buy SOL", change: "Scheduled", changeColor: "text-blue-400" }
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      computer: (
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
            Scripted Swaps & Smart Routines
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-2xl mx-auto">
          {routines.map((routine, index) => (
            <motion.div
              key={routine.title}
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
                      {getIcon(routine.icon)}
                    </div>
                    {/* Mini mockup */}
                    <div className="bg-gray-800 rounded-lg p-3 text-xs">
                      <div className="text-white font-medium">{routine.mockup.value}</div>
                      <div className={`${routine.mockup.changeColor} text-xs`}>{routine.mockup.change}</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{routine.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {routine.description}
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

export default SmartRoutinesSection;






