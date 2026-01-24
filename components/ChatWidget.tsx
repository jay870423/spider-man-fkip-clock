
import { ThemeConfig, ChatMessage, CharacterId, MoodType } from '../types';
import { sendMessageToCharacterStream } from '../services/geminiService';
import { playMoodBackground } from '../utils/soundUtils';
import React, { useState, useRef, useEffect } from 'react';

interface Props {
  theme: ThemeConfig;
  onCharacterSwitch: (id: CharacterId) => void;
  onSetAlarm: (time?: string, soundType?: string) => void;
  onStopAlarm: () => void;
}

export const ChatWidget: React.FC<Props> = ({ theme, onCharacterSwitch, onSetAlarm, onStopAlarm }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `我是警官 ${theme.name}。今天有什么可以帮你的？你可以对我说“画一张画”或者“设置10分钟闹钟”。` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeThemeIdRef = useRef(theme.id);

  useEffect(() => {
    activeThemeIdRef.current = theme.id;
    setMessages([{ role: 'model', text: `切换至 ${theme.name} 主题。我们聊聊吧！` }]);
  }, [theme.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const currentSessionThemeId = theme.id;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessages(prev => [...prev, { role: 'model', text: '' }]);
    setIsLoading(true);

    try {
      const stream = sendMessageToCharacterStream(theme, userMsg);
      let currentResponse = "";
      
      for await (const update of stream) {
        if (activeThemeIdRef.current !== currentSessionThemeId) break;

        if (update.textChunk) {
          currentResponse += update.textChunk;
          setMessages(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { role: 'model', text: currentResponse };
            return newHistory;
          });
        }

        if (update.generatedImageUrl) {
          setMessages(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { 
              role: 'model', 
              text: currentResponse || "这是为你画的图：", 
              imageUrl: update.generatedImageUrl 
            };
            return newHistory;
          });
        }

        if (update.moodMusic) playMoodBackground(update.moodMusic);
        if (update.alarmConfig) onSetAlarm(update.alarmConfig.time, update.alarmConfig.soundType);
        if (update.stopAlarm) onStopAlarm();
      }
    } catch (err) {
      setMessages(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { role: 'model', text: "连接异常。请检查网络或确认 API Key 已配置。" };
        return newHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative w-full h-[40vh] sm:h-[45vh] min-h-[300px] flex flex-col rounded-[2.5rem] ${theme.primaryColor} bg-opacity-20 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden`}>
      <div className="px-5 py-3 border-b border-white/5 bg-black/10 flex items-center gap-3">
          <img src={theme.avatarUrl} className="w-8 h-8 rounded-full border border-white/20" alt={theme.name} />
          <span className="text-white/60 text-[10px] font-bold tracking-widest uppercase">{theme.name} · 伴侣模式</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-white text-black rounded-br-none' : 'bg-black/40 text-white rounded-bl-none border border-white/5'}`}>
              {msg.text}
              {msg.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                  <img src={msg.imageUrl} className="w-full h-auto" alt="AI Generated" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-black/20">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="像聊天一样对话或下令..."
            className="w-full bg-white/10 border border-white/5 rounded-full pl-5 pr-12 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/20 transition-all"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 text-white rounded-full flex items-center justify-center">➤</button>
        </div>
      </form>
    </div>
  );
};
