import React from "react";
import { Home, MessageSquare, FileText, User, Settings } from 'lucide-react';
import { NavBar } from "./tubelight-navbar";
import { useAuth } from "@/context/AuthContext";

export function TubelightNavBarDemo() {
  const { isAuthenticated } = useAuth();
  
  const navItems = [
    { name: 'Home', url: '/', icon: Home },
    { name: 'Features', url: '#features', icon: MessageSquare },
    { name: 'FAQ', url: '#faq', icon: FileText },
    { name: 'Docs', url: '/docs', icon: FileText },
    ...(isAuthenticated ? [
      { name: 'Chat', url: '/chat', icon: User },
      { name: 'Settings', url: '/settings', icon: Settings }
    ] : [])
  ];

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <NavBar items={navItems} />
    </div>
  );
}

