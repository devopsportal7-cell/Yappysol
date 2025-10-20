import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const sections = [
  { id: "introduction", label: "Introduction", emoji: "👋" },
  { id: "key-capabilities", label: "Key Capabilities", emoji: "🧠" },
  { id: "mission-vision", label: "Mission & Vision", emoji: "🎯" },
  { id: "technical-architecture", label: "Technical Architecture", emoji: "⚙️" },
  { id: "tokenomics", label: "Tokenomics", emoji: "💰" },
  { id: "community", label: "Community", emoji: "🌐" },
  { id: "faq", label: "FAQ", emoji: "❓" },
];

const sectionContent = {
  introduction: (
    <>
      <h2 id="introduction" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>👋</span> Introduction</h2>
      <p className="mb-2 text-base md:text-lg text-gray-300">Chatta is your Solana-native AI copilot. Effortlessly swap tokens, launch meme coins, analyze your portfolio, and more—all through natural chat commands. Built for speed, security, and developer delight.</p>
    </>
  ),
  "key-capabilities": (
    <>
      <h2 id="key-capabilities" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>🧠</span> Key Capabilities</h2>
      <ul className="list-disc ml-6 space-y-1 text-base md:text-lg">
        <li><b>Natural Language Swaps:</b> Swap any Solana token with a simple message.</li>
        <li><b>Token Launchpad:</b> Create and launch meme tokens in seconds.</li>
        <li><b>Portfolio Analytics:</b> Get real-time insights and performance breakdowns.</li>
        <li><b>Trending Tokens:</b> Discover what's hot on Solana right now.</li>
        <li><b>Onchain AI:</b> All actions require wallet confirmation. Your keys, your coins.</li>
      </ul>
    </>
  ),
  "mission-vision": (
    <>
      <h2 id="mission-vision" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>🎯</span> Mission & Vision</h2>
      <h3 className="text-lg md:text-xl font-bold mb-1 text-chatta-purple">Our Mission</h3>
      <p className="mb-2 text-base md:text-lg text-gray-300">Empower everyone to use Solana like a pro, with the help of AI. Lower the barrier to DeFi, make crypto fun, and keep users in control.</p>
      <h3 className="text-lg md:text-xl font-bold mb-1 text-chatta-purple">Vision</h3>
      <ul className="list-disc ml-6 space-y-1 text-base md:text-lg">
        <li>Frictionless blockchain UX for all.</li>
        <li>Open-source, community-driven innovation.</li>
        <li>Accessible, secure, and fast for everyone.</li>
      </ul>
    </>
  ),
  "technical-architecture": (
    <>
      <h2 id="technical-architecture" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>⚙️</span> Technical Architecture</h2>
      <ul className="list-disc ml-6 space-y-1 text-base md:text-lg">
        <li><b>Full-stack TypeScript:</b> Modern, robust, and scalable.</li>
        <li><b>AI Model Integration:</b> GPT-4, Claude, and more for smart, safe chat.</li>
        <li><b>Security:</b> Non-custodial, wallet-based actions. No seed phrase ever.</li>
        <li><b>Performance:</b> Ultra-fast, low-latency Solana RPC and backend.</li>
      </ul>
    </>
  ),
  tokenomics: (
    <>
      <h2 id="tokenomics" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>💰</span> Tokenomics</h2>
      <ul className="list-disc ml-6 space-y-1 text-base md:text-lg">
        <li><b>$CHAT Utility:</b> Access premium features, governance, and rewards.</li>
        <li><b>Fair Launch:</b> No VCs, no insiders. 100% for the community.</li>
        <li><b>Transparency:</b> All contracts open-source and verifiable.</li>
      </ul>
    </>
  ),
  community: (
    <>
      <h2 id="community" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>🌐</span> Community</h2>
      <ul className="list-disc ml-6 space-y-1 text-base md:text-lg">
        <li>Open-source on <a href="https://github.com/your-repo" className="text-chatta-cyan underline hover:glow">GitHub</a></li>
        <li>Join the conversation on <a href="https://x.com/solchatta" className="text-chatta-cyan underline hover:glow">X</a></li>
        <li>Suggest features, report bugs, or contribute code.</li>
      </ul>
    </>
  ),
  faq: (
    <>
      <h2 id="faq" className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center gap-2 text-chatta-cyan"><span>❓</span> FAQ</h2>
      <ul className="list-disc ml-6 space-y-1 text-base md:text-lg">
        <li><b>Is Chatta free?</b> Yes, core features are free. Premium features require $CHAT.</li>
        <li><b>Is my wallet safe?</b> 100%. Chatta never asks for your seed phrase.</li>
        <li><b>Can I contribute?</b> Absolutely! PRs and feedback welcome.</li>
      </ul>
    </>
  ),
};

const Docs: React.FC = () => {
  const navigate = useNavigate();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setSidebarOpen(false); // close sidebar on mobile after click
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-chatta-darker via-chatta-dark to-black text-white font-mono">
      {/* Hero Header */}
      <div className="py-10 md:py-16 text-center relative">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight flex items-center justify-center gap-2">
          <span role="img" aria-label="book">📚</span> Chatta Documentation
        </h1>
        <p className="text-base md:text-xl text-gray-300 mb-4">Everything you need to navigate Solana with AI.</p>
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          <a href="https://docs.chatta.fun" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-full px-6 py-2 bg-gradient-to-r from-chatta-purple to-chatta-cyan text-white font-bold shadow-md hover:glow">
              View on GitBook
            </Button>
          </a>
                      <Button variant="gradient" className="rounded-full px-6 py-2 font-bold shadow-md" onClick={() => navigate("/")}>← Back to App</Button>
        </div>
      </div>
      {/* Main Layout */}
      <div className="flex max-w-5xl md:max-w-6xl mx-auto px-2 md:px-6">
        {/* Sidebar Navigation */}
        <aside className="relative">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden fixed top-4 left-4 z-40 bg-chatta-dark border border-chatta-purple/30 text-chatta-cyan rounded-full px-4 py-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-chatta-cyan/40"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Open documentation navigation"
          >
            {sidebarOpen ? "Close" : "Docs Menu"}
          </button>
          {/* Sidebar (desktop & mobile drawer) */}
          <nav
            className={`
              fixed md:sticky top-20 md:top-24 left-0 z-30
              bg-chatta-dark/95 md:bg-transparent
              border-r border-chatta-purple/10 md:border-none
              w-64 md:w-56
              h-full md:h-fit
              px-6 py-8 md:py-0
              transition-transform duration-200
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
              md:relative md:block
              shadow-2xl md:shadow-none
            `}
            style={{ minWidth: 200, maxWidth: 260 }}
          >
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    className="w-full text-left px-4 py-2 rounded-full font-semibold transition-all hover:bg-chatta-purple/20 hover:text-chatta-cyan focus:outline-none focus:ring-2 focus:ring-chatta-cyan/40"
                    onClick={() => scrollToSection(section.id)}
                  >
                    <span className="mr-2">{section.emoji}</span>
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/60 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar overlay"
            />
          )}
        </aside>
        {/* Main Content */}
        <main className="flex-1 prose prose-invert max-w-4xl mx-auto py-4 md:py-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={el => (sectionRefs.current[section.id] = el)}
              className="scroll-mt-28 py-10 md:py-12 mb-4 border border-chatta-purple/20 rounded-xl bg-chatta-darker/70 shadow-lg backdrop-blur-md"
            >
              {sectionContent[section.id as keyof typeof sectionContent]}
              <a
                href={`#${section.id}`}
                className="text-chatta-cyan underline hover:glow text-xs ml-2"
                aria-label={`Anchor link to ${section.label}`}
              >
                #
              </a>
            </section>
          ))}
          {/* Feedback/Edit on GitHub */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-6 py-2 bg-gradient-to-r from-chatta-purple to-chatta-cyan text-white font-bold shadow-md hover:glow"
            >
              Edit on GitHub
            </a>
            <span className="text-xs text-gray-500">Found an issue? PRs & feedback welcome!</span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Docs; 