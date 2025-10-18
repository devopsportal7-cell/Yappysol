import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './ChatMarkdown.css';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  options?: string[];
}

const ChatWindow = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Hello! I'm Chatta, your AI assistant for Solana. How can I help you today?",
      isUser: false,
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const userMsg = {
      id: crypto.randomUUID(),
      content: newMessage,
      isUser: true,
    };
    setMessages(prev => [...prev, userMsg]);
    setNewMessage("");
    
    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newMessage,
          context: {
            // Add walletAddress or other context if needed
          }
        }),
      });
      const data = await response.json();
      const content = data.prompt || data.response || data.error || data.content || "No response from assistant.";
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), content: content, isUser: false }
      ]);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), content: "Error contacting backend.", isUser: false }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full">
      <header className="border-b border-orange-500/20 p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/tikka-logo-text.png.png" alt="Tikka" className="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 bg-orange-500/10 px-2 sm:px-3 py-1 rounded-full truncate">
            <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></div>
            <span className="truncate">Wallet: 8xF2...k9J3</span>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3 md:px-4 py-3 md:py-4">
          <div className="space-y-4 md:space-y-6">
            {messages.map(msg => (
              <div 
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} gap-2 md:gap-3`}
              >
                {!msg.isUser && (
                  <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                    <img src="/lovable-uploads/tikka-logo-abstract.png.png" alt="Tikka" className="h-full w-full rounded-full" />
                    <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs">TK</AvatarFallback>
                  </Avatar>
                )}
                
                <div 
                  className={`max-w-[80%] sm:max-w-[75%] flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}
                >
                  <div 
                    className={`rounded-2xl px-3 py-2 md:px-4 md:py-2 ${
                      msg.isUser 
                        ? 'bg-white/10 text-white' 
                        : 'bg-orange-500/10 border border-orange-500/20'
                    }`}
                  >
                    {msg.isUser ? (
                      <p className="text-sm md:text-base">{msg.content}</p>
                    ) : (
                      <div className="markdown-body text-sm md:text-base">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            a: ({node, ...props}) => (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 underline hover:text-blue-600 transition-colors"
                              />
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {msg.options && (
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 mt-2 w-full">
                      {msg.options.map((option, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="bg-gray-800 border-orange-500/20 hover:border-orange-500 hover:bg-orange-500/10 hover:glow text-xs md:text-sm truncate"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                
                {msg.isUser && (
                  <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-chatta-gray/20 text-xs">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>
      
      <form onSubmit={handleSubmit} className="border-t border-orange-500/20 p-3 md:p-4 flex-shrink-0 bg-gray-900">
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            size="icon" 
            variant="ghost" 
            className="text-gray-400 hover:text-white hidden sm:flex"
          >
            <Paperclip size={20} />
          </Button>
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 bg-chatta-darker border-orange-500/10 focus-visible:ring-orange-500 text-sm md:text-base"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="bg-orange-500 hover:bg-orange-600 glow"
          >
            <Send size={16} className="sm:size-[18px]" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
