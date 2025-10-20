import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const JoinMovementSection = () => {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Join the Movement
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              We're onboarding the next million Solana users —<br />
              Not through dashboards. Through DMs.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              className="bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black hover:brightness-110 px-8 py-3 text-lg font-medium rounded-lg transition-all duration-300"
            >
              Launch Chat
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border border-white text-white hover:bg-white/10 px-8 py-3 text-lg font-medium rounded-lg transition-all duration-300"
            >
              Contribute on GitHub
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JoinMovementSection;







