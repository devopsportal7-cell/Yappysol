import React from "react";

const TradingInterfaceMockup = () => {
  return (
    <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden">
      {/* Main Interface Layout */}
      <div className="grid grid-cols-12 gap-4 h-[400px]">
        
        {/* Left Panel - Asset List */}
        <div className="col-span-3 bg-[#111111] rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4 text-sm">Assets</h3>
          <div className="space-y-3">
            {[
              { symbol: 'SOL', price: '$98.45', change: '+2.34%', changeColor: 'text-green-400' },
              { symbol: 'USDC', price: '$1.00', change: '+0.01%', changeColor: 'text-green-400' },
              { symbol: 'RAY', price: '$3.21', change: '-1.23%', changeColor: 'text-red-400' },
              { symbol: 'JUP', price: '$0.87', change: '+5.67%', changeColor: 'text-green-400' },
              { symbol: 'BONK', price: '$0.000023', change: '+12.45%', changeColor: 'text-green-400' }
            ].map((asset, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-[#1a1a1a] cursor-pointer">
                <div>
                  <div className="text-white text-sm font-medium">{asset.symbol}</div>
                  <div className="text-[#A0A0A0] text-xs">{asset.price}</div>
                </div>
                <div className={`text-xs font-medium ${asset.changeColor}`}>
                  {asset.change}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Chart */}
        <div className="col-span-6 bg-[#111111] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">SOL/USDC</h3>
            <div className="flex gap-2">
              <button className="px-2 py-1 text-xs bg-[#1a1a1a] text-white rounded">1H</button>
              <button className="px-2 py-1 text-xs bg-[#F6C945] text-black rounded">4H</button>
              <button className="px-2 py-1 text-xs bg-[#1a1a1a] text-white rounded">1D</button>
            </div>
          </div>
          
          {/* Mock Chart */}
          <div className="h-64 bg-[#0a0a0a] rounded relative overflow-hidden">
            {/* Chart Grid Lines */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute w-full h-px bg-white" style={{ top: `${i * 25}%` }}></div>
              ))}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute h-full w-px bg-white" style={{ left: `${i * 12.5}%` }}></div>
              ))}
            </div>
            
            {/* Mock Candlesticks */}
            <svg className="absolute inset-0 w-full h-full">
              {[...Array(20)].map((_, i) => {
                const isGreen = Math.random() > 0.5;
                const height = Math.random() * 60 + 20;
                const x = (i / 19) * 100;
                const y = 50 + (Math.random() - 0.5) * 40;
                
                return (
                  <rect
                    key={i}
                    x={`${x}%`}
                    y={`${y}%`}
                    width="2"
                    height={`${height}px`}
                    fill={isGreen ? '#22c55e' : '#ef4444'}
                    opacity="0.8"
                  />
                );
              })}
            </svg>
            
            {/* Price Line */}
            <svg className="absolute inset-0 w-full h-full">
              <path
                d="M 0,60 Q 25,50 50,45 T 100,40"
                stroke="#F6C945"
                strokeWidth="2"
                fill="none"
                opacity="0.8"
              />
            </svg>
          </div>
          
          {/* Price Info */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <div className="text-white text-lg font-bold">$98.45</div>
              <div className="text-green-400 text-sm">+$2.34 (+2.43%)</div>
            </div>
            <div className="text-[#A0A0A0] text-xs">
              Volume: 1.2M SOL
            </div>
          </div>
        </div>

        {/* Right Panel - Order Book & Trading */}
        <div className="col-span-3 space-y-4">
          {/* Order Book */}
          <div className="bg-[#111111] rounded-lg p-4 h-[180px]">
            <h3 className="text-white font-semibold mb-4 text-sm">Order Book</h3>
            <div className="space-y-1 text-xs">
              {[
                { price: '98.50', amount: '1,234', type: 'sell' },
                { price: '98.49', amount: '2,567', type: 'sell' },
                { price: '98.48', amount: '890', type: 'sell' },
                { price: '98.47', amount: '1,456', type: 'sell' },
                <div key="spread" className="text-center text-[#F6C945] font-medium py-1">98.47</div>,
                { price: '98.46', amount: '2,100', type: 'buy' },
                { price: '98.45', amount: '1,789', type: 'buy' },
                { price: '98.44', amount: '3,200', type: 'buy' },
                { price: '98.43', amount: '1,500', type: 'buy' }
              ].map((item, index) => (
                typeof item === 'object' ? (
                  <div key={index} className={`flex justify-between p-1 rounded ${item.type === 'sell' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                    <span className={item.type === 'sell' ? 'text-red-400' : 'text-green-400'}>{item.price}</span>
                    <span className="text-[#A0A0A0]">{item.amount}</span>
                  </div>
                ) : item
              ))}
            </div>
          </div>

          {/* Trading Panel */}
          <div className="bg-[#111111] rounded-lg p-4 h-[180px]">
            <h3 className="text-white font-semibold mb-4 text-sm">Trade</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-green-500/20 text-green-400 rounded text-xs font-medium">Buy</button>
                <button className="flex-1 py-2 bg-[#1a1a1a] text-white rounded text-xs">Sell</button>
              </div>
              <div>
                <label className="text-[#A0A0A0] text-xs block mb-1">Amount</label>
                <input 
                  type="text" 
                  placeholder="0.00" 
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <button className="w-full py-2 bg-gradient-to-r from-[#F6C945] to-[#FF6F3C] text-black rounded text-sm font-medium">
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="mt-4 bg-[#111111] rounded-lg p-3">
        <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
          <div className="flex items-center gap-4">
            <span>Connected to Solana Mainnet</span>
            <span>•</span>
            <span>Balance: 12.5 SOL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingInterfaceMockup;






