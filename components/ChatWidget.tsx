
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
  const [isPlayingVibe, setIsPlayingVibe] = useState(false);

  const toggleVibe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingVibe) {
      stopAllSounds();
      setIsPlayingVibe(false);
    } else {
      playMoodBackground(music.mood).then(() => {
        setIsPlayingVibe(true);
      });
    }
  };

  useEffect(() => {
      return () => {
        if (isPlayingVibe) stopAllSounds();
      };
  }, [isPlayingVibe]);

  const getPlatformLabel = (url?: string) => {
    if (!url) return "Platform";
    const low = url.toLowerCase();
    if (low.includes('y.qq.com')) return "QQ Music";
    if (low.includes('music.163.com')) return "NetEase";
    if (low.includes('kugou.com')) return "Kugou";
    if (low.includes('taihe.com') || low.includes('baidu.com')) return "Baidu Music";
    if (low.includes('youtube.com')) return "YouTube";
    if (low.includes('spotify.com')) return "Spotify";
    return "Music Store";
  };

  const platformLabel = getPlatformLabel(music.externalUrl);

  return (
    <div className={`mt-3 p-4 bg-white/10 backdrop-blur-xl rounded-2xl border transition-all duration-500 flex flex-col gap-3 group ${isPlayingVibe ? 'border-blue-400/50 bg-white/20' : 'border-white/10'}`}>
      <div className="flex items-center gap-4">
        {/* Synthetic Vibe Button */}
        <button 
          onClick={toggleVibe}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 active:scale-90 transition-all ${isPlayingVibe ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
          title="Play AI Synthesis"
        >
          {isPlayingVibe ? (
            <div className="flex gap-1 items-center">
              <div className="w-1 h-4 bg-white rounded-full animate-bounce"></div>
              <div className="w-1 h-4 bg-white rounded-full animate-bounce delay-75"></div>
            </div>
          ) : (
            <span className="text-xl">📻</span>
          )}
        </button>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
             <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase font-black tracking-widest">{music.mood} mood</span>
          </div>
          <h4 className="text-white font-black text-sm mt-0.5 truncate">{music.title}</h4>
          <p className="text-white/50 text-[10px] truncate">{music.artist}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {music.externalUrl && (
          <a 
            href={music.externalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-black hover:bg-blue-400 hover:text-white rounded-xl text-xs font-black transition-all shadow-xl"
          >
            <span>▶ Play on {platformLabel}</span>
            <span className="text-[10px]">↗</span>
          </a>
        )}
      </div>
      
      <p className="text-[9px] text-white/30 text-center uppercase font-bold tracking-widest">
        Click radio to play ambient vibe • Click button to open full song
      </p>
    </div>
  );
};

export const ChatWidget: React.FC<Props> = ({ theme, onCharacterSwitch, onSetAlarm, onStopAlarm }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeThemeIdRef = useRef(theme.id);
  const currentTurnTextRef = useRef(""); // Track text for the current stream to avoid state-race duplicates

  useEffect(() => {
    activeThemeIdRef.current = theme.id;
    const greetings = [
      `Officer ${theme.name} reporting! 🚔 Ready to chill with some music or set an alarm?`,
      `Hey! It's ${theme.name}. Ask me for a song or set a timer. What's up?`,
      `Welcome to the flip clock. I'm ${theme.name}. Feeling like some music?`
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
    currentTurnTextRef.current = "";

    try {
      const stream = sendMessageToCharacterStream(theme, userMsg);
      
      for await (const update of stream) {
        if (activeThemeIdRef.current !== currentSessionThemeId) break;

        if (update.textChunk) {
          currentTurnTextRef.current += update.textChunk;
          setMessages(prev => {
            const newHistory = [...prev];
            const lastIdx = newHistory.length - 1;
            const lastMsg = newHistory[lastIdx];
            
            // Only update the last message if it's from the model and doesn't already have music attached
            if (lastMsg.role === 'model' && !lastMsg.music) {
              newHistory[lastIdx] = { ...lastMsg, text: currentTurnTextRef.current };
            } else if (lastMsg.role === 'user' || lastMsg.music) {
              // If last was user or a music block, we start a new model text block
              newHistory.push({ role: 'model', text: currentTurnTextRef.current });
            }
            return newHistory;
          });
        }

        if (update.musicSuggestion) {
          // Push a dedicated music message block to keep UI clean and avoid duplicate text injections
          setMessages(prev => [
            ...prev, 
            { 
              role: 'model', 
              text: `Recommended for you:`, 
              music: update.musicSuggestion 
            }
          ]);
          currentTurnTextRef.current = ""; // Reset buffer for any post-tool-call text
        }

        if (update.alarmConfig) onSetAlarm(update.alarmConfig.time, update.alarmConfig.soundType);
        if (update.stopAlarm) onStopAlarm();
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `⚠️ Offline mode. Check connection.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative w-full h-[45vh] min-h-[400px] flex flex-col rounded-[2.5rem] ${theme.primaryColor} bg-opacity-20 backdrop-blur-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-700`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 bg-black/40 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-white/20 overflow-hidden bg-white/10 shadow-inner">
              <img src={theme.avatarUrl} className="w-full h-full object-cover" alt={theme.name} />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[10px] font-black tracking-widest uppercase">{theme.name}</span>
              <span className="text-blue-400 text-[8px] font-bold animate-pulse">● Connected</span>
            </div>
          </div>
          {isLoading && <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-gradient-to-b from-black/20 to-transparent">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`
              max-w-[90%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-2xl
              ${msg.role === 'user' 
                ? 'bg-white text-black rounded-br-none font-bold' 
                : 'bg-black/70 text-white rounded-bl-none border border-white/10 font-medium'
              }
            `}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.music && <MusicPlayer music={msg.music} />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Field */}
      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/5 relative z-20">
        <form onSubmit={handleSubmit} className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "Officer is thinking..." : "Search music, set alarm, or just chat..."}
            className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-14 py-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all ${isLoading ? 'opacity-20 cursor-wait' : 'bg-white text-black hover:bg-blue-400 hover:text-white active:scale-90 shadow-lg'}`}
          >
            {isLoading ? "..." : "➤"}
          </button>
        </form>
      </div>
    </div>
  );
};
