import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { PrivyProvider } from '@privy-io/react-auth';
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Docs from "./pages/Docs";
import { ChatProvider } from "./ChatContext";
import { AuthProvider } from "./context/AuthContext";
import { WalletProvider } from "./context/WalletContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import History from "./pages/History";
import Introduction from "./pages/docs/Introduction";
import Tokenomics from "./pages/docs/Tokenomics";
import Community from "./pages/docs/Community";
import FAQ from "./pages/docs/FAQ";
import Links from "./pages/docs/Links";
import DocsLayout from "./pages/docs/DocsLayout";

const queryClient = new QueryClient();

// Layout component to conditionally render the Navbar
const Layout = () => {
  const location = useLocation();
  // Hide navbar on homepage (uses tubelight navbar), chat, settings, history, dashboard
  const showNavbar = !["", "chat", "settings", "history", "dashboard"].includes(location.pathname.split("/")[1]);
  
  return (
    <div className="app-layout">
      {showNavbar && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/docs/*" element={<DocsLayout pageTitle="Documentation">{null}</DocsLayout>}>
            <Route index element={<Navigate to="introduction" replace />} />
            <Route path="introduction" element={<Introduction />} />
            <Route path="tokenomics" element={<Tokenomics />} />
            <Route path="community" element={<Community />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="links" element={<Links />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
  const isPrivyConfigured = privyAppId && privyAppId !== 'your-privy-app-id';

  const AppContent = () => (
    <ThemeProvider>
      <AuthProvider>
        <WalletProvider>
          <ChatProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <SidebarProvider>
                  <Layout />
                </SidebarProvider>
              </TooltipProvider>
            </QueryClientProvider>
          </ChatProvider>
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );

  if (isPrivyConfigured) {
    return (
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ['email', 'wallet', 'google', 'twitter'],
          appearance: {
            theme: 'light',
            accentColor: '#676FFF',
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
        }}
      >
        <AppContent />
      </PrivyProvider>
    );
  }

  // Fallback without PrivyProvider
  return <AppContent />;
};

export default App;
