'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
// Import the unified type directly to guarantee full cross-file alignment
import { getChatHistory, saveChatMessage, type ChatMessage } from '@/lib/supabase/database';

export default function ChatPanel() {
  // Using the unified database ChatMessage interface directly eliminates type assignment rejections
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getChatHistory();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{ 
          role: 'model', // Updated from 'ai' to perfectly match schema requirements
          content: "Hello! I'm LawSync AI, your legal assistant. I can help with questions about:\n\n• Tenant rights\n• Consumer protection\n• Contract review\n• Employment laws\n• Legal document guidance\n\nWhat legal question can I help you with today?",
          timestamp: new Date()
        }]);
      }
      setInitialLoading(false);
    };
    loadHistory();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    // Add typing indicator
    setMessages(prev => [...prev, { role: 'model', content: '...', timestamp: new Date() }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          // Extract history matching exactly what the backend expects
          history: messages.slice(-6)
        }),
      });
      
      const data = await response.json();
      const aiMessage: ChatMessage = { role: 'model', content: data.reply, timestamp: new Date() };
      
      // Remove typing indicator and append real response
      const updatedMessages = [...messages.slice(0, -1), userMessage, aiMessage];
      setMessages(updatedMessages);
      
      // Save to database type-safely
      await saveChatMessage(updatedMessages);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev.slice(0, -1), { 
        role: 'model', 
        content: '⚠️ Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    const newMessages: ChatMessage[] = [{ 
      role: 'model', 
      content: "Chat cleared! How can I help you with your legal questions today?",
      timestamp: new Date()
    }];
    setMessages(newMessages);
    await saveChatMessage(newMessages);
  };

  if (initialLoading) {
    return (
      <GlassCard className="flex flex-col h-150 p-0 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-white/60 text-sm">Loading chat history...</div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col h-150 p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/20 bg-linear-to-r from-blue-500/20 to-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white">LawSync AI Assistant</h2>
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">Powered by Gemini</span>
          </div>
          <button 
            onClick={clearChat}
            className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white/40 text-xs mt-1">Get instant answers to your legal questions</p>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl ${
              msg.role === 'user' 
                ? 'bg-linear-to-r from-blue-500 to-purple-600 text-white' 
                : 'glass text-white/90'
            }`}>
              {msg.content === '...' ? (
                <div className="flex gap-1 px-2 py-1">
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-white/20 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about tenant rights, contracts, consumer laws..."
          className="flex-1 glass rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          disabled={loading}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || !input.trim()}
          className="p-2 bg-linear-to-r from-blue-500 to-purple-600 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* Disclaimer */}
      <div className="px-4 pb-3">
        <p className="text-white/30 text-[10px] text-center uppercase tracking-wider">
          AI-generated information, not legal advice. Consult a licensed attorney.
        </p>
      </div>
    </GlassCard>
  );
}