import React from "react";
import { motion } from "framer-motion";

const MetricsSection = () => {
  const metrics = [
    {
      number: "20+",
      label: "On-Chain Functions"
    },
    {
      number: "$16B",
      label: "Solana TVL at your fingertips"
    },
    {
      number: "50k+",
      label: "Active Tokens Tracked"
    }
  ];

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="text-[#F6C945] text-4xl lg:text-5xl font-bold mb-2">
                {metric.number}
              </div>
              <div className="text-gray-400 text-lg">
                {metric.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;
