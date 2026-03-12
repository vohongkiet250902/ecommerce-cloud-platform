"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  products?: any[];
  timestamp: number;
};

export default function AiChatbox() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => 
     typeof window !== 'undefined' ? `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : ""
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatboxRef.current && !chatboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isExcludedPage = !pathname || pathname.startsWith("/admin") || pathname.startsWith("/auth");

  if (!mounted || isExcludedPage) {
    return null;
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue("");
    
    const newMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await apiClient.post("/ai/chat", {
        message: userText,
        sessionId,
        userId: user?.id
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: res.data.answer || "Xin lỗi, tôi không thể trả lời lúc này.",
        products: res.data.products || [],
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Đã có lỗi xảy ra khi kết nối với máy chủ AI. Vui lòng thử lại sau.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-0 shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(79,70,229,0.8)] focus:outline-none cursor-pointer"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full bg-blue-400 blur-xl"
            />
            
            <div className="relative flex h-full w-full items-center justify-center">
              <MessageSquare className="h-7 w-7 text-white" />
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -right-1 -top-1"
              >
                <Sparkles className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute -left-32 top-1/2 -translate-y-1/2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-xl border border-indigo-100 hidden sm:block pointer-events-none"
            >
              Hỏi Trợ Lý AI ✨
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div ref={chatboxRef}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20, transformOrigin: "bottom right" }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 w-[calc(100vw-48px)] max-w-[380px] h-[600px] max-h-[85vh] shadow-2xl flex flex-col z-50 overflow-hidden rounded-2xl border border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            >
              <div className="flex bg-primary text-primary-foreground items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-foreground/20 p-2 rounded-full">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Trợ lý AI</h3>
                    <p className="text-xs text-primary-foreground/70">Luôn sẵn sàng hỗ trợ bạn</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm my-10 opacity-70">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Xin chào! Mình có thể giúp gì cho bạn hôm nay?</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                      {msg.content}
                    </div>
                    
                    {msg.role === "ai" && msg.products && msg.products.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 w-full max-w-[320px]">
                        {msg.products.map((p) => (
                          <Link href={`/products/${p.slug || p.id}`} key={p.id} className="flex gap-3 bg-muted/50 border border-border/50 p-2 rounded-xl hover:bg-muted transition-colors no-underline text-foreground">
                            <div className="h-14 w-14 shrink-0 bg-white rounded-lg overflow-hidden border border-border/50 relative">
                              {p.image ? (
                                <Image src={p.image} alt={p.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate hover:text-primary transition-colors">{p.name}</p>
                              <p className="text-xs text-primary font-bold mt-1">
                                {new Intl.NumberFormat('vi-VN').format(p.minPrice || 0)}đ
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start">
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex items-center gap-2">
                       <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                       <span className="opacity-70 font-medium">AI đang suy nghĩ...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t bg-background">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input 
                    placeholder="Nhập câu hỏi của bạn..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 rounded-full px-4 border-border/60 focus-visible:ring-primary/20 bg-muted/30 font-medium"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading} className="h-10 w-10 shrink-0 rounded-full transition-transform active:scale-95">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
