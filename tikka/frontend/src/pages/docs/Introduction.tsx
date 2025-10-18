import DocsLayout from "./DocsLayout";

const Introduction = () => (
  <DocsLayout pageTitle="Introduction">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-chatta-cyan">Welcome to Chatta</h1>
    <p className="mb-4 text-base md:text-lg text-justify">
      Chatta is your AI assistant for the Solana blockchain, designed to bridge advanced artificial intelligence and on-chain functionality. Chatta helps traders, builders, and DeFi explorers interact with Solana’s ecosystem using natural language, giving you real-time insights, portfolio analytics, token tools, and automated blockchain execution via chat.<br/>
      Built for speed, clarity, and simplicity, Chatta removes the complexity of traditional blockchain interfaces and replaces them with intelligent conversation.
    </p>
    <h2 className="text-xl md:text-2xl font-bold mt-6 mb-2 text-chatta-purple">Key Capabilities</h2>
    <ul className="list-disc ml-6 space-y-2 text-base md:text-lg text-justify">
      <li><b>AI-Powered Terminal:</b> Natural Language Interface, Smart Routing & Execution, Command-Line Mindset</li>
      <li><b>Blockchain Function-Calling:</b> Solana-Native Execution, AI Agents</li>
      <li><b>Real-Time Data:</b> Live Market Insights, Portfolio Analysis</li>
      <li><b>Ecosystem Integrations:</b> Jupiter, Pump.fun, Magic Eden, Dexscreener, Solana Explorer, Phantom & Backpack</li>
    </ul>
  </DocsLayout>
);

export default Introduction; 