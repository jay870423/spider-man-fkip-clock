
import React, { useState, useEffect, useRef } from 'react';
import { THEMES } from './constants';
import { CharacterId, TimeState, ThemeConfig, Alarm } from './types';
import { FlipCard } from './components/FlipCard';
import { CharacterSelector } from './components/CharacterSelector';
import { ChatWidget } from './components/ChatWidget';
import { AddCharacterModal } from './components/AddCharacterModal';
import { SettingsModal } from './components/SettingsModal';
import { Spiderman } from './components/Spiderman';
import { AlarmOverlay } from './components/AlarmOverlay';
import { generateNewCharacterTheme } from './services/geminiService';
import { playContextualVibe, stopAllSounds } from './utils/soundUtils';

const getWeatherIcon = (code: number) => {
  if (code === 0) return '☀️'; 
  if (code >= 1 && code <= 3) return '⛅'; 
  if (code >= 45 && code <= 48) return '🌫️'; 
  if (code >= 51 && code <= 67) return '🌧️'; 
  if (code >= 71 && code <= 77) return '🌨️'; 
  if (code >= 80 && code <= 82) return '🌦️'; 
  if (code >= 95) return '⛈️'; 
  return '🌡️';
};

const App: React.FC = () => {
  const [themes, setThemes] = useState<Record<string, ThemeConfig>>(THEMES);
  const [themeId, setThemeId] = useState<CharacterId>(Object.keys(THEMES)[0]);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  
  const [isIdle, setIsIdle] = useState(false);
  const [autoScreensaver, setAutoScreensaver] = useState(true);
  const [idleDelay, setIdleDelay] = useState(15); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const [time, setTime] = useState<TimeState>({ hours: '12', minutes: '00', seconds: '00', ampm: 'AM' });
  const [dateString, setDateString] = useState<string>('');
  const [weather, setWeather] = useState<{temp: number, code: number, city: string} | null>(null);
  
  const currentTheme = themes[themeId] || themes[Object.keys(themes)[0]];

  // Idle Logic
  useEffect(() => {
    const resetTimer = () => {
      setIsIdle(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (autoScreensaver && !isAlarmRinging && !isSettingsOpen && !isModalOpen) {
        idleTimerRef.current = window.setTimeout(() => setIsIdle(true), idleDelay * 1000);
      }
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(n => document.addEventListener(n, resetTimer));
    resetTimer();
    return () => {
      events.forEach(n => document.removeEventListener(n, resetTimer));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [autoScreensaver, idleDelay, isAlarmRinging, isSettingsOpen, isModalOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const h = now.getHours();
      setTime({
        hours: pad(h % 12 || 12),
        minutes: pad(now.getMinutes()),
        seconds: pad(now.getSeconds()),
        ampm: h >= 12 ? 'PM' : 'AM'
      });
      setDateString(new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(now));
      
      if (alarm?.isActive && `${pad(h)}:${pad(now.getMinutes())}` === alarm.time && now.getSeconds() === 0) {
        setIsAlarmRinging(true);
        playContextualVibe(h < 12 ? 'morning' : 'afternoon');
        setAlarm(prev => prev ? {...prev, isActive: false} : null);
      }
      requestAnimationFrame(update);
    };
    const frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [alarm]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
        const data = await res.json();
        setWeather({ temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, city: "当前位置" });
      } catch (e) {}
    }, () => {}, { timeout: 5000 });
  }, []);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${currentTheme.bgGradient} transition-colors duration-1000 flex flex-col items-center overflow-x-hidden overflow-y-auto font-sans relative pb-20`}>
      {/* Spider-Man Layer (z-60) */}
      <Spiderman />
      
      {/* Top Bar Navigation (z-80) */}
      <div className={`w-full z-[80] p-4 flex justify-between items-start transition-opacity duration-700 sticky top-0 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex flex-col gap-2 bg-black/40 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/20 shadow-2xl">
           <div className="flex items-center gap-3 text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase">
              <span className="opacity-80">📅 {dateString}</span>
              <div className="w-px h-3 bg-white/30" />
              <span>{weather ? `${getWeatherIcon(weather.code)} ${weather.temp}°C` : '🌤️ 载入中'}</span>
           </div>
        </div>
        
        <div className="flex gap-2">
            <button onClick={toggleFullscreen} className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl hover:bg-white/20 transition-all">⤢</button>
            <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl hover:bg-white/20 transition-all">⚙️</button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-4xl flex flex-col items-center justify-start gap-8 px-4 mt-4 transition-all duration-1000 ${isIdle ? 'opacity-0 scale-95 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
        
        {/* Animals Selector (z-70 to be above Spiderman) */}
        <div className="w-full relative z-[70] py-2">
          <CharacterSelector currentThemeId={themeId} themes={themes} onSelect={setThemeId} onAddClick={() => setIsModalOpen(true)} />
        </div>

        {/* Flip Clock */}
        <div className="flex flex-col items-center py-6">
            <div className="flex items-center gap-2 sm:gap-4 scale-[0.8] sm:scale-100 lg:scale-110 transition-transform">
              <div className="flex gap-1.5"><FlipCard digit={time.hours[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.hours[1]} animationClass={currentTheme.animationClass} /></div>
              <div className="flex flex-col gap-3 px-1"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" /><div className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" /></div>
              <div className="flex gap-1.5"><FlipCard digit={time.minutes[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.minutes[1]} animationClass={currentTheme.animationClass} /></div>
              <div className="hidden md:flex flex-col gap-3 px-1 opacity-40"><div className="w-1.5 h-1.5 bg-white rounded-full" /><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
              <div className="hidden md:flex gap-1 opacity-60 scale-90"><FlipCard digit={time.seconds[0]} animationClass={currentTheme.animationClass} isSeconds /><FlipCard digit={time.seconds[1]} animationClass={currentTheme.animationClass} isSeconds /></div>
            </div>
            <div className="mt-6 text-white/40 font-display text-lg tracking-[0.3em] uppercase">{time.ampm}</div>
        </div>

        {/* Chat */}
        <div className="w-full max-w-xl pb-10 relative z-[50]">
          <ChatWidget theme={currentTheme} onCharacterSwitch={setThemeId} onSetAlarm={(t) => setAlarm({ id: '1', time: t!, soundType: 'digital', isActive: true })} onStopAlarm={() => { setIsAlarmRinging(false); stopAllSounds(); }} />
        </div>
      </main>

      {/* Screensaver Mode UI */}
      <div className={`fixed inset-0 z-0 flex flex-col items-center justify-center transition-all duration-1000 pointer-events-none ${isIdle ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
          <div className="flex items-center gap-4 scale-[1.1] sm:scale-[1.8] lg:scale-[2.5] drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="flex gap-1"><FlipCard digit={time.hours[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.hours[1]} animationClass={currentTheme.animationClass} /></div>
            <div className="flex flex-col gap-4 py-2"><div className="w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white]" /><div className="w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white]" /></div>
            <div className="flex gap-1"><FlipCard digit={time.minutes[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.minutes[1]} animationClass={currentTheme.animationClass} /></div>
          </div>
          <div className="mt-20 text-white/10 font-display text-4xl tracking-[1.5em] animate-pulse uppercase select-none">{currentTheme.name}</div>
      </div>

      <AddCharacterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onGenerate={async (n) => {
        const nt = await generateNewCharacterTheme(n);
        if (nt) { setThemes(prev => ({...prev, [nt.id]: nt})); setThemeId(nt.id); }
      }} />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} autoScreensaver={autoScreensaver} setAutoScreensaver={setAutoScreensaver} idleDelay={idleDelay} setIdleDelay={setIdleDelay} />
      
      {isAlarmRinging && <AlarmOverlay time={`${time.hours}:${time.minutes}`} characterName={currentTheme.name} onStop={() => { setIsAlarmRinging(false); stopAllSounds(); }} />}
    </div>
  );
};

export default App;
