
import { ThemeConfig, ChatMessage, CharacterId, MusicMetadata } from '../types';
import { sendMessageToCharacterStream } from '../services/geminiService';
import { playMoodBackground, stopAllSounds } from '../utils/soundUtils';
import React, { useState, useRef, useEffect } from 'react';

interface Props {
  theme: ThemeConfig;
  onCharacterSwitch: (id: CharacterId) => void;
  onSetAlarm: (time?: string, soundType?: string) => void;
  onStopAlarm: () => void;
}

const MusicPlayer: React.FC<{ music: MusicMetadata }> = ({ music }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (isPlaying) {
      stopAllSounds();
      setIsPlaying(false);
    } else {
      playMoodBackground(music.mood).then(() => {
        setIsPlaying(true);
      });
    }
  };

  useEffect(() => {
      return () => {
        if (isPlaying) stopAllSounds();
      };
  }, [isPlaying]);

  return (
    <div className={`mt-3 p-4 bg-white/10 backdrop-blur-xl rounded-2xl border transition-all duration-500 flex flex-col gap-3 group ${isPlaying ? 'border-white/40 bg-white/20' : 'border-white/10'}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 active:scale-90 transition-all ${isPlaying ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
          title="Play mood ambient"
        >
          {isPlaying ? (
            <div className="flex gap-1 items-center">
              <div className="w-1 h-4 bg-white rounded-full"></div>
              <div className="w-1 h-4 bg-white rounded-full"></div>
            </div>
          ) : (
            <span className="text-xl ml-0.5">▶</span>
          )}
        </button>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
             <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">{music.mood} VIBE</span>
             {isPlaying && <span className="text-[9px] text-green-400 animate-pulse font-bold uppercase">Synthesizing...</span>}
          </div>
          <h4 className="text-white font-black text-sm mt-0.5 truncate">{music.title}</h4>
          <p className="text-white/50 text-[10px] truncate">{music.artist}</p>
        </div>
      </div>

      {music.externalUrl && (
        <a 
          href={music.externalUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 hover:text-white transition-all font-bold"
        >
          <span>🎧 Listen on Platform</span>
          <span className="text-[10px]">↗</span>
        </a>
      )}
    </div>
  );
};

export const ChatWidget: React.FC<Props> = ({ theme, onCharacterSwitch, onSetAlarm, onStopAlarm }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeThemeIdRef = useRef(theme.id);

  // Initial welcome based on the character
  useEffect(() => {
    activeThemeIdRef.current = theme.id;
    const greetings = [
      `Officer ${theme.name} reporting! 🚔 Ready to hang out, listen to music, or just chat about life. What's on your mind?`,
      `Hey there! It's ${theme.name}. I'm here to keep you company while you work. Feel like talking?`,
      `Welcome to the Zootopia flip clock. I'm ${theme.name}, your companion for today. How are you feeling?`
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setMessages([{ role: 'model', text: randomGreeting }]);
  }, [theme.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const currentSessionThemeId = theme.id;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessages(prev => [...prev, { role: 'model', text: '...' }]);
    setIsLoading(true);

    try {
      const stream = sendMessageToCharacterStream(theme, userMsg);
      let fullText = "";
      
      for await (const update of stream) {
        if (activeThemeIdRef.current !== currentSessionThemeId) break;

        if (update.textChunk) {
          fullText += update.textChunk;
          setMessages(prev => {
            const newHistory = [...prev];
            const lastMsg = newHistory[newHistory.length - 1];
            if (lastMsg.role === 'model' && !lastMsg.music) {
               newHistory[newHistory.length - 1] = { ...lastMsg, text: fullText };
            } else {
               newHistory.push({ role: 'model', text: fullText });
            }
            return newHistory;
          });
        }

        if (update.musicSuggestion) {
          setMessages(prev => [
            ...prev, 
            { 
              role: 'model', 
              text: `Since you asked, here's a great song to match our vibe:`, 
              music: update.musicSuggestion 
            }
          ]);
        }

        if (update.alarmConfig) onSetAlarm(update.alarmConfig.time, update.alarmConfig.soundType);
        if (update.stopAlarm) onStopAlarm();
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `⚠️ Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative w-full h-[45vh] min-h-[400px] flex flex-col rounded-[2.5rem] ${theme.primaryColor} bg-opacity-20 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-black/40 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-white/20 overflow-hidden bg-white/10 shadow-inner">
              <img src={theme.avatarUrl} className="w-full h-full object-cover" alt={theme.name} />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[10px] font-black tracking-widest uppercase">{theme.name}</span>
              <span className="text-green-400 text-[8px] font-bold animate-pulse">● Online & Ready to Chat</span>
            </div>
          </div>
          {isLoading && <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-gradient-to-b from-black/20 to-transparent">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`
              max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-2xl
              ${msg.role === 'user' 
                ? 'bg-white text-black rounded-br-none' 
                : 'bg-black/70 text-white rounded-bl-none border border-white/10'
              }
            `}>
              <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
              {msg.music && <MusicPlayer music={msg.music} />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/50 backdrop-blur-xl border-t border-white/5 relative z-20">
        <form onSubmit={handleSubmit} className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "Typing..." : "Say something, ask for music or an alarm..."}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-14 py-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all ${isLoading ? 'opacity-20 cursor-wait' : 'bg-white/10 text-white hover:bg-white/20 active:scale-90'}`}
          >
            {isLoading ? "..." : "➤"}
          </button>
        </form>
      </div>
    </div>
  );
};
