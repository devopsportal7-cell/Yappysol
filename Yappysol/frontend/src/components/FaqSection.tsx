import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How secure is Yappysol?",
    answer: "Yappysol uses end-to-end encryption and never stores your private keys. All transactions are signed locally in your browser, and we use industry-standard security practices to protect your data."
  },
  {
    question: "Which wallets are supported?",
    answer: "Yappysol supports all major Solana wallets including Phantom, Solflare, Backpack, and more. You can also import private keys securely for direct wallet management."
  },
  {
    question: "What can I do with Yappysol?",
    answer: "You can swap tokens, launch new projects on Pump.fun, track your portfolio, analyze market sentiment, manage multiple wallets, and get AI-powered insights about your investments."
  },
  {
    question: "Is there a mobile app?",
    answer: "Yappysol is currently web-based and works great on mobile browsers. We're working on native mobile apps for iOS and Android."
  },
  {
    question: "How does the AI chat work?",
    answer: "Our AI understands natural language commands and translates them into Solana operations. Just type what you want to do, and Yappysol handles the technical details."
  },
  {
    question: "Are there any fees?",
    answer: "Yappysol is free to use. You only pay standard Solana network fees for transactions, which are typically less than $0.01."
  }
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 bg-[#111111]">
      <div className="container mx-auto max-w-4xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(246,201,69,0.1)] border border-[rgba(246,201,69,0.2)] mb-6">
            <div className="w-2 h-2 bg-[#F6C945] rounded-full"></div>
            <span className="text-sm font-medium text-[#F6C945]">FAQ</span>
          </div>
          <h2 className="text-[36px] lg:text-[48px] font-bold mb-6 text-white leading-[1.2]">
            Frequently asked questions
          </h2>
          <p className="text-[18px] text-[#A0A0A0] max-w-2xl mx-auto leading-[1.6]">
            Everything you need to know about Yappysol and how it works.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-[rgba(246,201,69,0.3)] transition-all duration-300">
                <button
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-200"
                  onClick={() => toggleFaq(index)}
                >
                  <h3 className="text-[18px] font-medium text-white pr-4">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-[#A0A0A0]" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-6 pt-0">
                        <p className="text-[16px] text-[#A0A0A0] leading-[1.6]">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;