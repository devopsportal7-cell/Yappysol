import React from "react";
import { Button } from "@/components/ui/button";
import { Rocket, TrendingUp, BarChart3, Zap } from "lucide-react";

const MeetChatta = () => {
  return (
    <section id="meet-chatta" className="relative z-10 py-32 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 gradient-text">
            Meet Chatta
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Your AI-powered Solana assistant that understands natural language and executes blockchain operations with precision and speed.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Chat Preview */}
          <div className="neo-card p-8 lg:p-10 rounded-3xl">
            <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 p-6 rounded-2xl mb-6">
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                <span className="text-base font-medium text-gray-700 dark:text-gray-300">Chatta</span>
              </div>
              <p className="text-gray-800 dark:text-white text-base leading-relaxed">
                I'll help you swap 5 SOL to BONK. Here's the best route:
                <br /><br />
                <span className="text-orange-600 dark:text-orange-400 font-medium">Route:</span> SOL → USDC → BONK<br />
                <span className="text-orange-600 dark:text-orange-400 font-medium">Slippage:</span> 0.5%<br />
                <span className="text-orange-600 dark:text-orange-400 font-medium">Price Impact:</span> 0.12%<br />
                <span className="text-orange-600 dark:text-orange-400 font-medium">Estimated Output:</span> ~42,269,832 BONK
              </p>
            </div>
            <div className="bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <p className="text-gray-800 dark:text-white font-medium mb-4 text-lg">Swap 5 SOL to BONK</p>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-orange-500 to-pink-500 animate-pulse rounded-full"></div>
              </div>
                    </div>
                  </div>
                  
          {/* Core Capabilities */}
          <div className="space-y-8">
            <div className="flex items-start space-x-6 p-6 neo-card rounded-2xl hover:scale-105 transition-transform duration-300">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Swap with Speed</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">Execute token swaps across multiple DEXs with optimal routing and minimal slippage.</p>
                      </div>
                    </div>
                    
            <div className="flex items-start space-x-6 p-6 neo-card rounded-2xl hover:scale-105 transition-transform duration-300">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Launch a Token</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">Create and deploy new tokens with custom parameters and automated liquidity provision.</p>
                      </div>
                    </div>
                    
            <div className="flex items-start space-x-6 p-6 neo-card rounded-2xl hover:scale-105 transition-transform duration-300">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Analyze Portfolios</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">Get real-time insights into your portfolio performance, P&L, and asset allocation.</p>
                    </div>
                  </div>

            <div className="flex items-start space-x-6 p-6 neo-card rounded-2xl hover:scale-105 transition-transform duration-300">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
                </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Track Market Sentiment</h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">Monitor social sentiment, trending tokens, and market movements in real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeetChatta;
