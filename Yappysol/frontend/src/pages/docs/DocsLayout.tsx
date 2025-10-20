import React, { useState } from "react";
import { NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/docs/introduction", label: "Introduction", emoji: "👋" },
  { to: "/docs/tokenomics", label: "Tokenomics", emoji: "💰" },
  { to: "/docs/community", label: "Community", emoji: "🌐" },
  { to: "/docs/faq", label: "FAQ", emoji: "❓" },
  { to: "/docs/links", label: "Links", emoji: "🔗" },
];

const DocsLayout: React.FC<{ children?: React.ReactNode; pageTitle?: string }> = ({ children, pageTitle = "" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If children are provided, render only children (for direct usage in /docs/* route wrapper)
  if (children) {
    return <>{children ? children : <Outlet />}</>;
  }

  // Otherwise, render the full docs layout (for nested routes)
  return (
    <div className="min-h-screen bg-gradient-to-br from-chatta-darker via-chatta-dark to-black text-white font-mono">
      <div className="flex max-w-5xl md:max-w-6xl mx-auto px-2 md:px-6 pt-8">
        {/* Sidebar */}
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
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all justify-start
                      ${isActive ? "bg-chatta-purple/30 text-chatta-cyan shadow" : "hover:bg-chatta-purple/20 hover:text-chatta-cyan text-gray-300"}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span>{item.emoji}</span>
                    {item.label}
                  </NavLink>
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
        <main className="flex-1 max-w-4xl mx-auto py-4 md:py-10 px-2 md:px-8">
          {/* Breadcrumb/Page Title */}
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
            <span className="text-lg md:text-2xl font-extrabold text-white tracking-tight">{pageTitle}</span>
          </div>
          <div className="bg-chatta-darker/80 border border-chatta-purple/20 rounded-xl shadow-lg backdrop-blur-md p-6 md:p-10">
            <div className="prose prose-invert max-w-none text-justify">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocsLayout; 