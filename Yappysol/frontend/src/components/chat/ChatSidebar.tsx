import React, { useEffect, useState } from "react";
import { MessageSquare, History, Settings, X, Pencil, Trash2, PanelLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useChatContext } from "@/ChatContext";
import { useSidebar } from "@/context/SidebarContext";

interface ChatSidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ChatSidebar = ({ onClose, collapsed: collapsedProp, onToggleCollapse }: ChatSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { chatSessions, currentChatId, startNewChat, switchChat, renameChat, deleteChat } = useChatContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const sidebar = useSidebar();
  const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : sidebar.collapsed;
  const toggleCollapsed = onToggleCollapse || sidebar.toggleCollapsed;
  
  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, []);
  
  useEffect(() => {
    if (editingId) {
      const input = document.getElementById("chat-rename-input");
      if (input) (input as HTMLInputElement).focus();
    }
  }, [editingId]);
  
  // Define navigation items
  const navItems = [
    { icon: MessageSquare, label: "Chat", route: "/chat", active: path === "/chat" },
    { icon: History, label: "History", route: "/history", active: path === "/history" },
    { icon: Settings, label: "Settings", route: "/settings", active: path === "/settings" },
  ];

  const handleNavigation = (route: string) => {
    navigate(route);
  };
  
  // Handle switching to a chat session
  const handleSwitchChat = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    switchChat(id);
    navigate("/chat");
    if (onClose) onClose();
  };
  
  const handleRename = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
  };

  const handleRenameSubmit = (id: string) => {
    if (editValue.trim()) {
      renameChat(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };
  
  return (
    <div className={`h-screen flex flex-col bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-r border-orange-500/20 transition-all duration-300 ${collapsed ? 'w-[64px]' : 'w-[280px]'}`}>
      {/* Premium Header with enhanced styling */}
      <div className="p-6 border-b border-orange-500/20 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-orange-600/8 backdrop-blur-sm">
        <div className="flex items-center gap-3 justify-center w-full">
          <a 
            href="/"
            onClick={(e) => handleNavigation('/')}
            className="cursor-pointer flex justify-center w-full group"
          >
            <div className="flex items-center gap-3 group-hover:scale-105 transition-transform duration-200">
              <div className="w-20 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/25">
                <img src="/lovable-uploads/tikka-logo-text.png.png" alt="Yappysol" className="h-14 w-18 object-contain" />
              </div>
            </div>
          </a>
        </div>
        <button 
          onClick={toggleCollapsed}
          className="text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 ml-2 p-3 rounded-xl hover:bg-orange-500/15 transition-all duration-200 hover:scale-105"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft size={22} />
        </button>
      </div>
      
      {/* Premium Navigation with enhanced styling */}
      <nav className={`pt-8 ${collapsed ? 'px-0' : 'px-6'}`} style={{ minHeight: 0 }}>
        <ul className={`space-y-4 w-full`}>
          {navItems.map((item, index) => (
            <motion.li 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={collapsed ? 'flex justify-center w-full' : ''}
            >
              <button
                type="button"
                onClick={(e) => handleNavigation(item.route)}
                className={cn(
                  `flex items-center ${collapsed ? 'justify-center' : 'gap-4'} ${collapsed ? 'w-14 h-14 mx-auto my-2 rounded-2xl' : 'px-5 py-4'} rounded-2xl transition-all duration-300 cursor-pointer group`,
                  item.active 
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-500/50 shadow-xl shadow-orange-500/30 transform scale-105" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-orange-500/15 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-500/40 border border-transparent hover:scale-105"
                )}
                style={collapsed ? { padding: 0 } : {}}
                aria-label={item.label}
              >
                <item.icon size={24} className={cn(
                  item.active ? "text-white" : "group-hover:text-orange-500",
                  "transition-colors duration-200"
                )} />
                {!collapsed && <span className="font-semibold text-base">{item.label}</span>}
              </button>
            </motion.li>
          ))}
        </ul>
      </nav>
      
      {/* Spacer to push Recent Chats and Footer to the bottom */}
      <div className="flex-1" />
      
      {/* Enhanced Recent Chats - moved to bottom */}
      {collapsed ? (
        <div className="flex flex-col items-center mb-6">
          <ul className="space-y-3">
            {chatSessions.map((chat) => (
              <li key={chat.id} className="flex justify-center">
                <button
                  onClick={(e) => handleSwitchChat(chat.id, e)}
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group",
                    chat.id === currentChatId 
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25" 
                      : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-orange-500/20 hover:scale-105"
                  )}
                  title={chat.customTitle || chat.title}
                  style={{ minWidth: 0 }}
                >
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold uppercase text-white">
                    {chat.customTitle ? chat.customTitle[0] : (chat.title ? chat.title[0] : 'C')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-6 border-t border-orange-500/20 mb-0 bg-gradient-to-r from-orange-500/8 to-orange-600/6 backdrop-blur-sm">
          <h3 className="text-xs uppercase text-gray-500 dark:text-gray-400 font-bold mb-6 tracking-wider">Recent Chats</h3>
          <ul className="space-y-3">
            {chatSessions && chatSessions.length > 0 ? chatSessions.map((chat) => (
              <li key={chat.id} className="group flex items-center">
                <a
                  href="/chat"
                  onClick={(e) => handleSwitchChat(chat.id, e)}
                  className={cn(
                    "flex-1 text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 text-sm flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-500/15 cursor-pointer transition-all duration-300 group hover:scale-105",
                    chat.id === currentChatId ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border border-orange-500/50 shadow-xl shadow-orange-500/30 transform scale-105" : ""
                  )}
                  title={chat.customTitle || chat.title || 'Untitled Chat'}
                  style={{ minWidth: 0 }}
                >
                  <span className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0 shadow-sm"></span>
                  {editingId === chat.id ? (
                    <input
                      id="chat-rename-input"
                      className="bg-transparent border-b border-orange-500 text-gray-900 dark:text-white px-1 py-0.5 w-full outline-none"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(chat.id)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleRenameSubmit(chat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      maxLength={30}
                    />
                  ) : (
                    <span className="truncate font-medium" style={{ maxWidth: 140 }}>
                      {chat.customTitle || (chat.title && chat.title.length > 24 ? chat.title.slice(0, 24) + "..." : (chat.title || 'Untitled Chat'))}
                    </span>
                  )}
                </a>
                {/* Edit and Delete icons */}
                <button
                  className="ml-2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                  title="Rename chat"
                  onClick={() => handleRename(chat.id, chat.customTitle || chat.title || 'Untitled Chat')}
                  tabIndex={-1}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="ml-1 p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                  title="Delete chat"
                  onClick={() => deleteChat(chat.id)}
                  tabIndex={-1}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            )) : (
              <li className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                No recent chats
              </li>
            )}
          </ul>
          
          {/* Premium New Chat Button */}
          <div className="mt-6">
            <button
              onClick={() => {
                startNewChat();
                navigate("/chat");
                if (onClose) onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg",
                collapsed 
                  ? "justify-center w-14 h-14 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-xl shadow-orange-500/30" 
                  : "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-xl shadow-orange-500/30 font-semibold"
              )}
              title="Start new chat"
            >
              <Plus size={collapsed ? 22 : 20} />
              {!collapsed && <span>New Chat</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
