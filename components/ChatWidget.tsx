
import React, { useState, useRef, useEffect } from 'react';
import { ThemeConfig, ChatMessage, CharacterId, AIProvider } from '../types';
import { sendMessageToCharacterStream, resetChatSession } from '../services/geminiService';

interface Props {
  theme: ThemeConfig;
  onCharacterSwitch: (id: CharacterId) => void;
  onSetAlarm: (time?: string, soundType?: string) => void;
  onStopAlarm: () => void;
}

export const ChatWidget: React.FC<Props> = ({ theme, onCharacterSwitch, onSetAlarm, onStopAlarm }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hi! I'm ${theme.name}. Ready to chat!` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('GEMINI');
  const [deepSeekKey, setDeepSeekKey] = useState(localStorage.getItem('DEEPSEEK_KEY') || '');

  // Track the current theme ID to handle race conditions during streaming
  const activeThemeIdRef = useRef(theme.id);

  // Load provider preference
  useEffect(() => {
    const savedProvider = localStorage.getItem('AI_PROVIDER') as AIProvider;
    if (savedProvider) setProvider(savedProvider);
  }, []);

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

  const saveSettings = () => {
      localStorage.setItem('AI_PROVIDER', provider);
      localStorage.setItem('DEEPSEEK_KEY', deepSeekKey);
      setShowSettings(false);
      // Reset session to apply new provider context cleanly
      resetChatSession(); 
  };

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
      // Pass provider and optional key
      const stream = sendMessageToCharacterStream(theme, userMsg, provider, deepSeekKey);
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
          /* Responsive Height Logic: 
             - Mobile: 50vh (keeps keyboard space)
             - Small Tablet: 55vh
             - Desktop: 60vh
             - Max Height limit to look good on massive screens
          */
          h-[50vh] sm:h-[55vh] md:h-[60vh] max-h-[700px] min-h-[350px]
          rounded-[2rem] 
          ${theme.primaryColor} bg-opacity-30 backdrop-blur-xl 
          border border-white/20 shadow-2xl 
          transition-all duration-500 ease-in-out
          overflow-hidden
      `}>
        
        {/* Header */}
        <div className="flex-none px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-4 border-b border-white/10 bg-black/10">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/60 overflow-hidden shadow-md shrink-0 transition-transform duration-300 hover:scale-110">
                <img src={theme.avatarUrl} className="w-full h-full object-cover" alt={theme.name} />
             </div>
             <div className="min-w-0 flex-1">
                 <h3 className="text-white font-display text-lg sm:text-xl tracking-wider uppercase truncate">{theme.name}</h3>
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${provider === 'GEMINI' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                    <p className="text-white/60 text-xs font-sans truncate">{theme.role} ({provider === 'GEMINI' ? 'Gemini' : 'DeepSeek'})</p>
                 </div>
             </div>
             
             {/* Settings Toggle */}
             <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                title="Settings"
             >
                ⚙️
             </button>

             {/* Reset Button */}
             <button 
                onClick={handleReset}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                title="Reset Chat"
             >
                ⟳
             </button>
        </div>

        {/* Settings Panel (Overlay) */}
        {showSettings && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md p-6 flex flex-col items-center justify-center text-white animate-fade-in-up">
                <h3 className="text-xl font-display mb-6 tracking-widest">CHAT SETTINGS</h3>
                
                <div className="w-full max-w-xs space-y-4">
                    <div>
                        <label className="text-xs text-white/50 uppercase font-bold block mb-2">Model Provider</label>
                        <div className="flex bg-white/10 rounded-lg p-1">
                            <button 
                                onClick={() => setProvider('GEMINI')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${provider === 'GEMINI' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Gemini
                            </button>
                            <button 
                                onClick={() => setProvider('DEEPSEEK')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${provider === 'DEEPSEEK' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                DeepSeek
                            </button>
                        </div>
                    </div>

                    {provider === 'DEEPSEEK' && (
                        <div className="animate-fade-in-up">
                            <label className="text-xs text-white/50 uppercase font-bold block mb-2">DeepSeek API Key</label>
                            <input 
                                type="password" 
                                value={deepSeekKey}
                                onChange={(e) => setDeepSeekKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            />
                            <p className="text-[10px] text-white/30 mt-1">Key is stored locally in your browser.</p>
                        </div>
                    )}

                    <button 
                        onClick={saveSettings}
                        className="w-full py-3 mt-4 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-colors uppercase tracking-wider"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        )}

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
