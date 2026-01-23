
import { ThemeConfig, ChatMessage, CharacterId, MoodType } from '../types';
import { sendMessageToCharacterStream, connectLiveVoice } from '../services/geminiService';
import { playMoodBackground, stopAmbientMusic } from '../utils/soundUtils';
import { decodeAudio, decodeAudioData, float32ToInt16Blob } from '../utils/audioUtils';
import { LiveServerMessage, FunctionCall } from '@google/genai';
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
    { role: 'model', text: `Hi! I'm ${theme.name}. Your emotional companion today. How are you feeling?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodType>('neutral');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeThemeIdRef = useRef(theme.id);
  
  // Voice Refs
  const audioContexts = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const liveSession = useRef<any>(null);
  const nextStartTime = useRef(0);
  const audioSources = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    activeThemeIdRef.current = theme.id;
    setMessages([
      { role: 'model', text: `Hi! I'm ${theme.name}. Let's chat about your day or set some goals!` }
    ]);
    stopVoiceChat();
  }, [theme.id, theme.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopAmbientMusic();
      setIsMusicPlaying(false);
    } else {
      playMoodBackground(currentMood === 'neutral' ? 'calm' : currentMood);
      setIsMusicPlaying(true);
    }
  };

  const stopVoiceChat = () => {
    if (liveSession.current) {
      liveSession.current.close();
      liveSession.current = null;
    }
    audioSources.current.forEach(s => { try { s.stop(); } catch(e){} });
    audioSources.current.clear();
    setIsVoiceActive(false);
  };

  const startVoiceChat = async () => {
    try {
      setIsVoiceActive(true);
      if (!audioContexts.current) {
        audioContexts.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const session = await connectLiveVoice(theme, {
        onMessage: async (message: LiveServerMessage) => {
          const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64) {
            const ctx = audioContexts.current!.output;
            nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
            const buffer = await decodeAudioData(decodeAudio(audioBase64), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.addEventListener('ended', () => audioSources.current.delete(source));
            source.start(nextStartTime.current);
            nextStartTime.current += buffer.duration;
            audioSources.add(source);
          }
          
          if (message.serverContent?.interrupted) {
            audioSources.current.forEach(s => { try { s.stop(); } catch(e){} });
            audioSources.current.clear();
            nextStartTime.current = 0;
          }

          // Safety fix for TS18048: Check for toolCall and functionCalls before iterating
          if (message.toolCall?.functionCalls) {
            message.toolCall.functionCalls.forEach((fc: FunctionCall) => {
                if (fc.name === 'playMusic') onSetAlarm();
                session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "ok" } }] });
            });
          }
        },
        onClose: () => stopVoiceChat(),
        onError: (e: any) => {
          console.error("Live Voice Error:", e);
          stopVoiceChat();
        }
      });

      liveSession.current = session;

      const source = audioContexts.current.input.createMediaStreamSource(stream);
      const scriptProcessor = audioContexts.current.input.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const data = float32ToInt16Blob(inputData);
        session.sendRealtimeInput({ media: { data, mimeType: 'audio/pcm;rate=16000' } });
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContexts.current.input.destination);

    } catch (err) {
      console.error("Failed to start voice chat:", err);
      setIsVoiceActive(false);
    }
  };

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
              text: currentResponse || "Here's what I created for you:", 
              imageUrl: update.generatedImageUrl 
            };
            return newHistory;
          });
        }

        if (update.moodMusic) {
          setCurrentMood(update.moodMusic);
          playMoodBackground(update.moodMusic);
          setIsMusicPlaying(true);
        }

        if (update.alarmConfig) onSetAlarm(update.alarmConfig.time, update.alarmConfig.soundType);
        if (update.stopAlarm) onStopAlarm();
        if (update.nextCharacterId && update.nextCharacterId !== theme.id) {
           setTimeout(() => onCharacterSwitch(update.nextCharacterId!), 1000);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { role: 'model', text: "Connection error. Please check your network." };
        return newHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full z-40">
      <div className={`relative flex flex-col w-full h-[55vh] max-h-[600px] rounded-[2rem] ${theme.primaryColor} bg-opacity-30 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden`}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/10">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full border-2 border-white/60 overflow-hidden shrink-0">
                    <img src={theme.avatarUrl} className="w-full h-full object-cover" alt={theme.name} />
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-white font-display text-lg tracking-wider uppercase truncate">{theme.name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">{isVoiceActive ? '🎙️ VOICE MODE' : currentMood.toUpperCase() + ' MOOD'}</span>
                    </div>
                 </div>
             </div>
             
             <div className="flex gap-2">
                 <button 
                    onClick={isVoiceActive ? stopVoiceChat : startVoiceChat}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isVoiceActive ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50'}`}
                    title="Toggle Voice Chat"
                 >
                    🎙️
                 </button>
                 <button 
                    onClick={toggleMusic}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMusicPlaying ? 'bg-white text-black' : 'bg-white/5 text-white/50'}`}
                    title="Toggle Mood Music"
                 >
                    {isMusicPlaying ? '🎵' : '🔇'}
                 </button>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isVoiceActive && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-white/40 animate-ping"></div>
                    <img src={theme.avatarUrl} className="w-20 h-20 rounded-full object-cover" alt={theme.name} />
                </div>
                <div className="text-white font-display tracking-widest text-center">
                    Listening to you...
                    <div className="flex gap-1 justify-center mt-4">
                        <div className="w-1 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-1 h-8 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-6 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                </div>
            </div>
          )}
          
          {!isVoiceActive && messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-white text-blue-900 rounded-br-none' : 'bg-black/20 text-white rounded-bl-none border border-white/5'}`}>
                 {msg.text}
                 {msg.imageUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                        <img src={msg.imageUrl} className="w-full h-auto" alt="AI Generated" />
                    </div>
                 )}
                 {!msg.text && !msg.imageUrl && <span className="animate-pulse">...</span>}
               </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gradient-to-t from-black/40 to-transparent">
            <form onSubmit={handleSubmit} className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isVoiceActive ? "Voice mode active..." : "Ask for a picture or just chat..."}
                  disabled={isVoiceActive}
                  className="w-full bg-black/40 border border-white/10 rounded-full pl-6 pr-14 py-4 text-white placeholder-white/40 outline-none focus:border-white/30 transition-all backdrop-blur-md disabled:opacity-50"
                />
                <button type="submit" disabled={isLoading || !input.trim() || isVoiceActive} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white">➤</button>
            </form>
        </div>
      </div>
    </div>
  );
};
