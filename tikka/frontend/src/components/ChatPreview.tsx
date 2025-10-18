import React from "react";

const ChatPreview = () => {
  return (
    <div className="neo-card rounded-2xl overflow-hidden shadow-2xl glow">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/30 to-orange-600/20 p-4 flex items-center border-b border-orange-500/20">
        <div className="flex space-x-2 mr-3">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex-1 text-center">
                      <div className="text-sm font-semibold gradient-text">Tikka AI</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Online</div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="p-4 space-y-4">
        {/* User Message 1 */}
        <div className="flex justify-end">
          <div className="bg-gradient-to-r from-orange-500/40 to-orange-600/30 rounded-2xl rounded-tr-none px-4 py-3 max-w-xs border border-orange-500/20">
            <p className="text-white font-medium">What's the price of $BONK?</p>
          </div>
        </div>
        
        {/* AI Response 1 */}
        <div className="flex justify-start">
          <div className="bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl rounded-tl-none px-4 py-3 max-w-xs border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tikka</p>
            </div>
            <p className="text-gray-800 dark:text-white text-sm leading-relaxed">
              $BONK is currently trading at $0.00001997, up 1.8% in the last 24h with a market cap of $1.77B.
            </p>
            <div className="mt-3 flex items-center">
              <div className="h-6 w-12 bg-gradient-to-r from-green-500 to-emerald-400 rounded mr-2"></div>
              <span className="text-green-600 dark:text-green-400 text-sm font-semibold">+1.8%</span>
            </div>
          </div>
        </div>
        
        {/* User Message 2 */}
        <div className="flex justify-end">
          <div className="bg-gradient-to-r from-orange-500/40 to-orange-600/30 rounded-2xl rounded-tr-none px-4 py-3 max-w-xs border border-orange-500/20">
            <p className="text-white font-medium">Swap 1 SOL to BONK</p>
          </div>
        </div>
        
        {/* AI Response 2 */}
        <div className="flex justify-start">
          <div className="bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl rounded-tl-none px-4 py-3 max-w-xs border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tikka</p>
            </div>
            <p className="text-gray-800 dark:text-white text-sm leading-relaxed mb-3">
              Processing your swap of 1 SOL to ~8,453,966.4 BONK at market rate...
            </p>
            <div className="p-3 rounded-xl bg-gray-200/40 dark:bg-black/40 border border-orange-500/30">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600 dark:text-gray-400">From</span>
                <span className="text-gray-800 dark:text-white font-medium">1 SOL</span>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-gray-600 dark:text-gray-400">To (estimated)</span>
                <span className="text-gray-800 dark:text-white font-medium">8,453,966.4 BONK</span>
              </div>
              <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-orange-500 to-orange-600 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-orange-500/20 bg-gradient-to-r from-orange-500/20 to-orange-600/10 flex items-center gap-3">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-gray-100/80 dark:bg-gray-900/80 text-gray-800 dark:text-white p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm placeholder-gray-500 dark:placeholder-gray-400"
          disabled
        />
        <button
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 rounded-xl font-semibold opacity-70 cursor-not-allowed hover:opacity-90 transition-opacity duration-300"
          disabled
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPreview;
