import React from "react";
import { motion } from "framer-motion";

const PressSection = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Spotted by the Media.
          </h2>
        </div>

        {/* Mobile Mockups */}
        <div className="flex justify-center gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gray-900 rounded-2xl p-8 max-w-sm"
          >
            <div className="bg-black rounded-xl p-6 text-center">
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="text-white text-sm font-medium mb-2">TechCrunch</div>
                <div className="text-gray-400 text-xs">"Revolutionary DeFi platform..."</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-900 rounded-2xl p-8 max-w-sm"
          >
            <div className="bg-black rounded-xl p-6 text-center">
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="text-white text-sm font-medium mb-2">CoinDesk</div>
                <div className="text-gray-400 text-xs">"Next-gen trading experience..."</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PressSection;






