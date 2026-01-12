
import React, { useState, useRef, useEffect } from 'react';
import { ThemeConfig, ChatMessage, CharacterId } from '../types';
import { sendMessageToCharacterStream, resetChatSession } from '../services/geminiService';

interface Props {
  theme: ThemeConfig;
  onCharacterSwitch: (id: CharacterId) => void;
  onSetAlarm: (time: string, soundType: string) => void;
  onStopAlarm: () => void;
}

export const ChatWidget: React.FC<Props> = ({ theme, onCharacterSwitch, onSetAlarm, onStopAlarm }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hi! I'm ${theme.name}. Ready to chat!` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track the current theme ID to handle race conditions during streaming
  const activeThemeIdRef = useRef(theme.id);

  // Reset chat when theme changes
  useEffect(() => {
    activeThemeIdRef.current = theme.id;
    
    // Completely clear and reset history
    setMessages([
      { role: 'model', text: `Hi! I'm ${theme.name}. Ready to chat!` },
      { role: 'model', text: `*${theme.name} entered the chat*` }
    ]);
    
    // Stop loading if a previous stream was interrupted
    setIsLoading(false);
  }, [theme.id, theme.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const currentSessionThemeId = theme.id; // Capture ID at start of request

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessages(prev => [...prev, { role: 'model', text: '' }]); // Placeholder for streaming
    setIsLoading(true);

    try {
      const stream = sendMessageToCharacterStream(theme, userMsg);
      let currentResponse = "";
      
      for await (const update of stream) {
        // If user switched characters while streaming, stop updating the old chat
        if (activeThemeIdRef.current !== currentSessionThemeId) {
            break;
        }

        if (update.textChunk) {
          currentResponse += update.textChunk;
          setMessages(prev => {
            const newHistory = [...prev];
            // Ensure we are updating the last message which is the placeholder
            if (newHistory.length > 0) {
                newHistory[newHistory.length - 1] = { 
                  role: 'model', 
                  text: currentResponse 
                };
            }
            return newHistory;
          });
        }

        if (update.alarmConfig) {
            onSetAlarm(update.alarmConfig.time, update.alarmConfig.soundType);
        }

        if (update.stopAlarm) {
            onStopAlarm();
        }

        if (update.nextCharacterId && update.nextCharacterId !== theme.id) {
           setMessages(prev => {
             const newHistory = [...prev];
             if (newHistory.length > 0) {
                newHistory[newHistory.length - 1] = {
                    role: 'model',
                    text: currentResponse + `\n\n(Detecting mood shift... calling ${update.nextCharacterId}...)`
                };
             }
             return newHistory;
           });
           
           // Slight delay before switching to allow user to read
           setTimeout(() => {
               // Only switch if we are still on the same theme context
               if (activeThemeIdRef.current === currentSessionThemeId) {
                   onCharacterSwitch(update.nextCharacterId!);
               }
           }, 1500);
        }
      }
    } catch (err) {
      console.error("Stream error", err);
    } finally {
      // Only turn off loading if we are still on the same theme
      if (activeThemeIdRef.current === currentSessionThemeId) {
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => {
    resetChatSession();
    setMessages([
        { role: 'model', text: `Hi! I'm ${theme.name}. Ready to chat!` },
        { role: 'model', text: `*${theme.name} entered the chat*` }
    ]);
  };

  return (
    <div className="relative w-full z-40 pb-safe">
      <div className={`
          relative flex flex-col 
          w-full
          h-[350px] sm:h-[450px] lg:h-[500px] /* Responsive Heights */
          rounded-[2rem] 
          ${theme.primaryColor} bg-opacity-30 backdrop-blur-xl 
          border border-white/20 shadow-2xl 
          transition-colors duration-500
          overflow-hidden
      `}>
        
        {/* Header */}
        <div className="flex-none px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-4 border-b border-white/10 bg-black/10">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/60 overflow-hidden shadow-md shrink-0 transition-transform duration-300 hover:scale-110">
                <img src={theme.avatarUrl} className="w-full h-full object-cover" alt={theme.name} />
             </div>
             <div className="min-w-0">
                 <h3 className="text-white font-display text-lg sm:text-xl tracking-wider uppercase truncate">{theme.name}</h3>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></div>
                    <p className="text-white/60 text-xs font-sans truncate">{theme.role}</p>
                 </div>
             </div>
             
             {/* Reset Button */}
             <button 
                onClick={handleReset}
                className="ml-auto w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                title="Reset Chat"
             >
                ⟳
             </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
               <div 
                 className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base leading-relaxed shadow-sm break-words
                 ${msg.role === 'user' 
                    ? 'bg-white text-blue-900 font-medium rounded-br-none' 
                    : 'bg-black/20 text-white rounded-bl-none border border-white/5'
                 }`}
               >
                 {msg.text || <span className="animate-pulse">...</span>}
               </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input */}
        <div className="flex-none p-3 sm:p-4 bg-gradient-to-t from-black/40 to-transparent">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Chat with ${theme.name}...`}
                  className="w-full bg-black/40 hover:bg-black/50 focus:bg-black/60 border border-white/10 focus:border-white/30 rounded-full pl-5 pr-12 py-3.5 text-white placeholder-white/40 outline-none transition-all shadow-inner backdrop-blur-md text-sm sm:text-base"
                />
                <button 
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <span className="group-hover:scale-110 transition-transform">➤</span>
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};
