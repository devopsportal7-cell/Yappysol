import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet as useAppWallet } from '@/context/WalletContext';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '@/services/api';

const apiUrl = API_BASE_URL;

const HistoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { wallet, loading: walletLoading } = useAppWallet();
  const walletAddress = wallet?.publicKey;

  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default to 10
  const [actionFilter, setActionFilter] = useState("ALL");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [tokenSearch, setTokenSearch] = useState("");

  // Log the raw data for debugging
  console.log('[History Debug] data:', data);

  // Filtered data
  const filteredData = data.filter(tx => {
    // Action filter
    if (actionFilter !== "ALL" && tx.transactionType.toUpperCase() !== actionFilter) return false;
    // Value filter
    const value = Number(tx.totalValueUsd) || 0;
    if (minValue && value < Number(minValue)) return false;
    if (maxValue && value > Number(maxValue)) return false;
    // Token search
    if (tokenSearch && !(tx.bought?.symbol?.toLowerCase().includes(tokenSearch.toLowerCase()) || tx.sold?.symbol?.toLowerCase().includes(tokenSearch.toLowerCase()))) return false;
    return true;
  });
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, filteredData.length);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    console.log('[History] Fetching transactions for wallet:', walletAddress);
    fetch(`${apiUrl}/api/transactions/${walletAddress}`)
      .then((res) => res.json())
      .then((res) => {
        console.log('[History] Raw API response:', res);
        const transactions = res.result || [];
        
        // Validate that transactions belong to the current wallet
        const validTransactions = transactions.filter(tx => {
          // Check if transaction involves the current wallet address
          const involvesWallet = tx.fromAddress === walletAddress || 
                                tx.toAddress === walletAddress ||
                                tx.walletAddress === walletAddress;
          if (!involvesWallet) {
            console.warn('[History] Transaction does not involve current wallet:', tx);
          }
          return involvesWallet;
        });
        
        console.log('[History] Valid transactions for wallet', walletAddress, ':', validTransactions.length);
        setData(validTransactions);
        setLoading(false);
        setCurrentPage(1); // Reset to first page on new data
      })
      .catch((err) => {
        console.error('[History] Error fetching transactions:', err);
        setError("Failed to load history");
        setLoading(false);
      });
  }, [walletAddress]);

  if (walletLoading) return <div className="p-8 text-center">Loading wallet...</div>;
  if (!walletAddress) return (
    <div className="p-8 text-center text-gray-400">
      No wallet found. Please contact support.
    </div>
  );
  if (loading) return <div className="p-8 text-center">Loading transaction history...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  
  // Show message if no transactions found
  if (data.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <img src="/lovable-uploads/tikka-logo-abstract.png.png" alt="Tikka" className="h-12 w-12" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">No Transactions Yet</h3>
          <p className="text-gray-400 mb-6">
            Your wallet is ready! Start trading to see your transaction history here.
          </p>
          <p className="text-sm text-gray-500">
            Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12">
      {/* Sticky filter/search bar */}
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg px-4 py-3 mb-6 flex flex-wrap items-center gap-4 border border-orange-500/10">
        <label className="text-gray-400 text-sm flex items-center gap-2">
          Action:
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="bg-gray-800 border border-orange-500/30 rounded px-2 py-1 text-white text-sm"
          >
            <option value="ALL">All</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>
        <label className="text-gray-400 text-sm flex items-center gap-2">
          Min 💲:
          <input
            type="number"
            value={minValue}
            onChange={e => { setMinValue(e.target.value); setCurrentPage(1); }}
            className="w-20 bg-gray-800 border border-orange-500/30 rounded px-2 py-1 text-white text-sm"
            min="0"
          />
        </label>
        <label className="text-gray-400 text-sm flex items-center gap-2">
          Max 💲:
          <input
            type="number"
            value={maxValue}
            onChange={e => { setMaxValue(e.target.value); setCurrentPage(1); }}
            className="w-20 bg-gray-800 border border-orange-500/30 rounded px-2 py-1 text-white text-sm"
            min="0"
          />
        </label>
        <div className="flex items-center gap-2 ml-auto">
          <Search className="text-orange-500" size={18} />
          <input
            type="text"
            placeholder="Search token..."
            value={tokenSearch}
            onChange={e => { setTokenSearch(e.target.value); setCurrentPage(1); }}
            className="bg-gray-800 border border-orange-500/30 rounded px-2 py-1 text-white text-sm w-40"
          />
        </div>
      </div>
      {/* Pagination info */}
      <div className="mb-4 text-gray-400 text-sm">
        Showing {filteredData.length === 0 ? 0 : startIdx}–{endIdx} of {filteredData.length} transactions
      </div>
      {/* Card list */}
      <div className="grid gap-6">
        {paginatedData.map((tx) => {
          const isBuy = tx.transactionType === 'buy';
          const isSell = tx.transactionType === 'sell';
          const isTransfer = tx.transactionType === 'transfer';
          const amount = isBuy
            ? `+${Number(tx.bought.amount).toLocaleString()} ${tx.bought.symbol}`
            : isSell
              ? `-${Number(tx.sold.amount).toLocaleString()} ${tx.sold.symbol}`
              : tx.amount ? `${Number(tx.amount).toLocaleString()} ${tx.symbol}` : '';
          const tokenSymbol = isBuy ? tx.bought.symbol : isSell ? tx.sold.symbol : tx.symbol;
          const tokenImage = isBuy
            ? tx.bought.logo || tx.bought.image
            : isSell
              ? tx.sold.logo || tx.sold.image
              : tx.logo || tx.image;
          const usdValue = tx.totalValueUsd ? Number(tx.totalValueUsd).toFixed(2) : 'N/A';
          const time = new Date(tx.blockTimestamp).toLocaleString();
          // Action badge color
          let actionColor = isBuy ? 'bg-green-900/40 text-green-400' : isSell ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400';
          let actionLabel = isBuy ? 'BUY' : isSell ? 'SELL' : 'TRANSFER';
          return (
            <div
              key={tx.transactionHash}
              className="flex flex-col md:flex-row items-center md:items-stretch gap-4 bg-gray-800 rounded-2xl shadow-lg border border-orange-500/10 p-5 hover:shadow-xl transition group"
            >
              {/* Token logo only */}
              <div className="flex items-center min-w-[60px] w-full md:w-auto justify-start">
                {tokenImage ? (
                  <img
                    src={tokenImage}
                    alt={tokenSymbol}
                    className="w-10 h-10 rounded-full border border-orange-500/30 shadow object-cover bg-gray-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center font-bold text-white text-lg border border-orange-500/30 shadow">
                    {tokenSymbol?.[0] || "?"}
                  </div>
                )}
              </div>
              {/* Improved Action badge */}
              <span className={`px-4 py-2 rounded-full text-base font-bold shadow-md ${actionColor} min-w-[80px] text-center uppercase tracking-wide border border-opacity-20 border-black`} style={{letterSpacing: '0.08em', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'}}>
                {actionLabel}
              </span>
              {/* Amount */}
              <span className={`font-mono text-xl font-bold ${isBuy ? 'text-green-300' : isSell ? 'text-red-300' : 'text-blue-300'} bg-gray-900/60 px-4 py-2 rounded-lg shadow-inner`}>{amount}</span>
              {/* USD value */}
                              <span className="flex items-center gap-1 text-base text-gray-200 bg-gray-900/60 px-3 py-2 rounded-lg">
                💲 {usdValue}
              </span>
              {/* Timestamp */}
              <span className="flex items-center gap-1 text-gray-400 text-sm bg-gray-900/60 px-3 py-2 rounded-lg">
                🕒 {time}
              </span>
              {/* View button */}
              <a
                href={`https://solscan.io/tx/${tx.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto px-5 py-2 rounded-full bg-orange-500 text-white font-bold flex items-center gap-2 shadow hover:bg-orange-600 transition"
                title="View on Solscan"
              >
                <Eye size={18} /> View
              </a>
            </div>
          );
        })}
      </div>
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-full bg-orange-500/20 text-white disabled:opacity-50 flex items-center gap-1"
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <span className="text-white text-base">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-full bg-orange-500/20 text-white disabled:opacity-50 flex items-center gap-1"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

const History = () => (
  <DashboardLayout pageTitle="Transaction History">
    <div className="p-6">
      <HistoryTable />
    </div>
  </DashboardLayout>
);

export default History; 