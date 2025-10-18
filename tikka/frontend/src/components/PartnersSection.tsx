import React from "react";
import { motion } from "framer-motion";

const PartnersSection = () => {
  const partners = [
    "Jupiter Aggregator", "Pump.fun", "Helius Explorer", "Dialect", "SolanaFM"
  ];

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Powering Solana's On-Chain Conversations
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Tikka connects directly to:
          </p>
        </div>

        {/* Partners Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center"
        >
          {partners.map((partner, index) => (
            <motion.div
              key={partner}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.8 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-gray-400 text-lg font-medium hover:text-white transition-colors duration-300"
            >
              {partner}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PartnersSection;
