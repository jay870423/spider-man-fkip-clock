
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
import { generateNewCharacterTheme, generatePersonalizedAlarmVoice } from './services/geminiService';
import { playContextualVibe, stopAllSounds } from './utils/soundUtils';
import { decodeAudioData } from './utils/audioUtils';

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
  const audioContext = useRef<AudioContext | null>(null);

  // Screensaver & UI States
  const [isIdle, setIsIdle] = useState(false);
  const [autoScreensaver, setAutoScreensaver] = useState(true);
  const [idleDelay, setIdleDelay] = useState(10); // seconds
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const [time, setTime] = useState<TimeState>(() => {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return {
       hours: hours.toString().padStart(2, '0'),
       minutes: now.getMinutes().toString().padStart(2, '0'),
       seconds: now.getSeconds().toString().padStart(2, '0'),
       ampm
    };
  });

  const [dateString, setDateString] = useState<string>('');
  const [weather, setWeather] = useState<{temp: number, code: number, city: string} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const currentTheme = themes[themeId] || themes[Object.keys(themes)[0]];

  // Idle Detection
  useEffect(() => {
    if (!autoScreensaver) {
      setIsIdle(false);
      return;
    }

    const resetTimer = () => {
      setIsIdle(false);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        if (!isAlarmRinging && !isSettingsOpen && !isModalOpen) {
          setIsIdle(true);
        }
      }, idleDelay * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, resetTimer));
    resetTimer();

    return () => {
      events.forEach(name => document.removeEventListener(name, resetTimer));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [autoScreensaver, idleDelay, isAlarmRinging, isSettingsOpen, isModalOpen]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const triggerAlarm = async () => {
    setIsAlarmRinging(true);
    const hour = new Date().getHours();
    let vibe: 'morning' | 'afternoon' | 'night' = 'night';
    if (hour >= 5 && hour < 11) vibe = 'morning';
    else if (hour >= 11 && hour < 17) vibe = 'afternoon';
    
    playContextualVibe(vibe);

    const voiceBytes = await generatePersonalizedAlarmVoice(currentTheme);
    if (voiceBytes) {
        if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const buffer = await decodeAudioData(voiceBytes, audioContext.current, 24000, 1);
        const source = audioContext.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.current.destination);
        source.start(audioContext.current.currentTime + 1);
    }
  };

  useEffect(() => {
    let frameId: number;
    const update = () => {
      const now = new Date();
      const rawHours = now.getHours();
      const pad = (n: number) => n.toString().padStart(2, '0');
      
      setTime({
        hours: pad(rawHours % 12 || 12),
        minutes: pad(now.getMinutes()),
        seconds: pad(now.getSeconds()),
        ampm: rawHours >= 12 ? 'PM' : 'AM'
      });
      setDateString(new Intl.DateTimeFormat('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' }).format(now));
      
      if (alarm?.isActive && `${pad(rawHours)}:${pad(now.getMinutes())}` === alarm.time && now.getSeconds() === 0) {
        triggerAlarm();
        setAlarm(prev => prev ? {...prev, isActive: false} : null);
      }
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [alarm, currentTheme]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
            const data = await res.json();
            const cityRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`);
            const cityData = await cityRes.json();
            setWeather({ 
              temp: Math.round(data.current.temperature_2m), 
              code: data.current.weather_code, 
              city: cityData.city || cityData.locality || cityData.principalSubdivision || "动物城" 
            });
            setLocationError(null);
          } catch (err) {
            setLocationError("天气更新失败");
          } finally {
            setIsLocating(false);
          }
        },
        () => {
          setIsLocating(false);
          setLocationError("无法获取定位");
        },
        { timeout: 10000 }
      );
    }
  }, []);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${currentTheme.bgGradient} transition-colors duration-1000 flex flex-col items-center overflow-x-hidden relative`}>
      <Spiderman />
      
      {/* Top Right Action Bar */}
      <div className={`fixed top-4 right-4 z-[70] flex gap-3 transition-opacity duration-500 ${isIdle ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
        <button 
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/10 transition-all shadow-xl"
          title="Toggle Fullscreen"
        >
          ⤢
        </button>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/10 transition-all shadow-xl"
          title="Screensaver Settings"
        >
          ⚙️
        </button>
      </div>

      {isAlarmRinging && <AlarmOverlay time={time.hours + ":" + time.minutes} characterName={currentTheme.name} onStop={() => { setIsAlarmRinging(false); stopAllSounds(); }} />}

      <div className={`z-10 w-full max-w-7xl flex flex-col items-center px-4 py-4 sm:py-8 transition-all duration-1000 ${isIdle ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <header className="w-full flex flex-col items-center mb-6 sm:mb-10">
          <h1 className="text-white font-display text-2xl sm:text-4xl tracking-widest mb-4 opacity-90">ZOOTOPIA FLIP</h1>
          
          <div className="flex flex-wrap justify-center items-center gap-3 bg-black/30 backdrop-blur-lg px-6 py-2 rounded-2xl border border-white/10 text-white text-xs sm:text-sm shadow-xl">
            <span className="flex items-center gap-1.5 border-r border-white/10 pr-3">
              📅 {dateString}
            </span>
            <div className="flex items-center gap-2 min-w-[120px] justify-center">
              {isLocating ? (
                <div className="flex items-center gap-2 animate-pulse text-white/60">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                  <span>定位中...</span>
                </div>
              ) : weather ? (
                <div className="flex items-center gap-2 animate-fade-in-up">
                  <span className="text-lg">{getWeatherIcon(weather.code)}</span>
                  <span className="font-bold">{weather.city}</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg">{weather.temp}°C</span>
                </div>
              ) : (
                <span className="text-white/40 italic">{locationError || "动物城办事处"}</span>
              )}
            </div>
          </div>

          <div className="mt-4 sm:mt-6 w-full max-w-md">
            <CharacterSelector currentThemeId={themeId} themes={themes} onSelect={setThemeId} onAddClick={() => setIsModalOpen(true)} />
          </div>
        </header>

        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Flip Clock remains visible even in idle but will be part of the central layout */}
          <div className="flex flex-col items-center scale-90 sm:scale-100 lg:scale-110 origin-center transition-transform">
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="flex gap-1"><FlipCard digit={time.hours[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.hours[1]} animationClass={currentTheme.animationClass} /></div>
              <div className="flex flex-col gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>
              <div className="flex gap-1"><FlipCard digit={time.minutes[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.minutes[1]} animationClass={currentTheme.animationClass} /></div>
              <div className="flex flex-col gap-2"><div className="w-1.5 h-1.5 bg-white/40 rounded-full" /><div className="w-1.5 h-1.5 bg-white/40 rounded-full" /></div>
              <div className="flex gap-1 opacity-80 scale-90 sm:scale-100"><FlipCard digit={time.seconds[0]} animationClass={currentTheme.animationClass} isSeconds /><FlipCard digit={time.seconds[1]} animationClass={currentTheme.animationClass} isSeconds /></div>
            </div>
            <div className="mt-4 text-white font-display text-xl tracking-tighter opacity-60">{time.ampm}</div>
          </div>

          <div className="w-full max-w-md lg:max-w-lg">
            <ChatWidget 
              theme={currentTheme} 
              onCharacterSwitch={setThemeId} 
              onSetAlarm={(t) => setAlarm({ id: '1', time: t!, soundType: 'digital', isActive: true })} 
              onStopAlarm={() => { setIsAlarmRinging(false); stopAllSounds(); }} 
            />
          </div>
        </div>
      </div>

      {/* Screensaver Content (Visible only when idle) */}
      <div className={`fixed inset-0 z-0 flex items-center justify-center transition-opacity duration-1000 ${isIdle ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col items-center scale-110 sm:scale-125 lg:scale-[1.8] origin-center">
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="flex gap-1"><FlipCard digit={time.hours[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.hours[1]} animationClass={currentTheme.animationClass} /></div>
              <div className="flex flex-col gap-2"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>
              <div className="flex gap-1"><FlipCard digit={time.minutes[0]} animationClass={currentTheme.animationClass} /><FlipCard digit={time.minutes[1]} animationClass={currentTheme.animationClass} /></div>
            </div>
            <div className="mt-12 text-white font-display text-2xl tracking-widest opacity-30 animate-pulse">{dateString}</div>
          </div>
      </div>

      <AddCharacterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onGenerate={async (n) => {
        const nt = await generateNewCharacterTheme(n);
        if (nt) { setThemes(prev => ({...prev, [nt.id]: nt})); setThemeId(nt.id); }
      }} />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        autoScreensaver={autoScreensaver}
        setAutoScreensaver={setAutoScreensaver}
        idleDelay={idleDelay}
        setIdleDelay={setIdleDelay}
      />
    </div>
  );
};

export default App;
