import React, { useState, useEffect } from "react";

const LiveChatPreview = () => {
  const [chatStep, setChatStep] = useState(0);
  const chatSequence = [
    { user: "Buy $BONK with $SOL", bot: null },
    { user: "Buy $BONK with $SOL", bot: "I'll help you swap SOL for BONK tokens. How much SOL would you like to swap?" },
    { user: "Buy $BONK with $SOL", bot: "I'll help you swap SOL for BONK tokens. How much SOL would you like to swap?", user2: "1.2 SOL please" },
    { 
      user: "Buy $BONK with $SOL", 
      bot: "I'll help you swap SOL for BONK tokens. How much SOL would you like to swap?", 
      user2: "1.2 SOL please", 
      bot2: "Swapping 1.2 $SOL for 3,800,000 $BONK..."
    },
    { 
      user: "Buy $BONK with $SOL", 
      bot: "I'll help you swap SOL for BONK tokens. How much SOL would you like to swap?", 
      user2: "1.2 SOL please", 
      bot2: "Swapping 1.2 $SOL for 3,800,000 $BONK... done! Transaction successful."
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chatStep < chatSequence.length - 1) {
        setChatStep(chatStep + 1);
      } else {
        setChatStep(0);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [chatStep, chatSequence.length]);

  const currentChat = chatSequence[chatStep];

  return (
    <div className="py-24 bg-chatta-darker">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Live <span className="gradient-text">Chat Preview</span>
          </h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
            See how easy it is to interact with Tikka and perform complex blockchain operations with a few messages.
          </p>

          <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-orange-500/30">
            <div className="bg-gray-800 p-3 flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <div className="flex-1 text-center text-sm text-gray-300">Live Demo</div>
            </div>
            
            <div className="p-4 min-h-[400px]">
              <div className="flex flex-col space-y-4">
                {/* Initial user message */}
                <div className="flex justify-end">
                  <div className="bg-orange-500/30 rounded-2xl rounded-tr-none px-4 py-2 max-w-xs">
                    <p className="text-white">{currentChat.user}</p>
                  </div>
                </div>
                
                {/* Bot first response */}
                {currentChat.bot && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-gray-800 rounded-2xl rounded-tl-none px-4 py-2 max-w-xs">
                      <div className="flex items-center mb-1">
                        <div className="w-2 h-2 bg-chatta-cyan rounded-full mr-2"></div>
                        <p className="text-xs text-chatta-cyan">Tikka</p>
                      </div>
                      <p className="text-white">{currentChat.bot}</p>
                    </div>
                  </div>
                )}
                
                {/* Second user message */}
                {currentChat.user2 && (
                  <div className="flex justify-end animate-fade-in">
                    <div className="bg-orange-500/30 rounded-2xl rounded-tr-none px-4 py-2 max-w-xs">
                      <p className="text-white">{currentChat.user2}</p>
                    </div>
                  </div>
                )}
                
                {/* Bot second response */}
                {currentChat.bot2 && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-gray-800 rounded-2xl rounded-tl-none px-4 py-2 max-w-xs">
                      <div className="flex items-center mb-1">
                        <div className="w-2 h-2 bg-chatta-cyan rounded-full mr-2"></div>
                        <p className="text-xs text-chatta-cyan">Tikka</p>
                      </div>
                      <p className="text-white">{currentChat.bot2}</p>
                      {currentChat.bot2.includes("done!") && (
                        <div className="mt-2 p-2 rounded bg-green-900/20 border border-green-500/30">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Transaction Hash</span>
                            <span className="text-green-400 truncate ml-2">4xZKf...8nUV</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-800 flex">
              <input 
                type="text" 
                placeholder="Ask Tikka anything..." 
                className="flex-1 bg-gray-800 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button className="ml-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-opacity-90">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveChatPreview;
