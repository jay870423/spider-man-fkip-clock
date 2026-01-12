
import React, { useState, useEffect, useRef } from 'react';
import { THEMES } from './constants';
import { CharacterId, TimeState, ThemeConfig, Alarm } from './types';
import { FlipCard } from './components/FlipCard';
import { CharacterSelector } from './components/CharacterSelector';
import { ChatWidget } from './components/ChatWidget';
import { AddCharacterModal } from './components/AddCharacterModal';
import { Spiderman } from './components/Spiderman';
import { AlarmOverlay } from './components/AlarmOverlay';
import { generateNewCharacterTheme } from './services/geminiService';
import { playAlarmSound } from './utils/soundUtils';

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
  
  // Alarm State
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

  // Initialize with correct time
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIdle, setIsIdle] = useState(false); // Screensaver mode state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const currentTheme = themes[themeId] || themes[Object.keys(themes)[0]];

  // --- WAKE LOCK (Keep screen on) ---
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                // @ts-ignore
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log("Wake Lock not supported or rejected:", err);
        }
    };
    
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
        }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        if (wakeLock) wakeLock.release();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  // --- IDLE TIMER (Screensaver Trigger) ---
  useEffect(() => {
      let timeout: any;
      const IDLE_LIMIT = 10000; // 10 seconds to trigger screensaver

      const resetTimer = () => {
          if (isIdle) setIsIdle(false);
          clearTimeout(timeout);
          timeout = setTimeout(() => setIsIdle(true), IDLE_LIMIT);
      };

      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      
      resetTimer(); // Start timer on mount

      return () => {
          clearTimeout(timeout);
          window.removeEventListener('mousemove', resetTimer);
          window.removeEventListener('touchstart', resetTimer);
          window.removeEventListener('keydown', resetTimer);
          window.removeEventListener('click', resetTimer);
      };
  }, [isIdle]);

  // --- TIME LOOP (Clock & Alarm Check) ---
  useEffect(() => {
    let frameId: number;
    let lastSecond = -1;

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
       weekday: 'short', 
       month: 'short', 
       day: 'numeric' 
    });

    const updateTime = () => {
      const now = new Date();
      const s = now.getSeconds();

      if (s !== lastSecond) {
        lastSecond = s;
        
        const rawHours = now.getHours();
        const rawMinutes = now.getMinutes();
        
        // Update Clock State
        let displayHours = rawHours % 12;
        displayHours = displayHours ? displayHours : 12; 
        const ampm = rawHours >= 12 ? 'PM' : 'AM';
        
        const pad = (n: number) => n.toString().padStart(2, '0');

        setTime({
          hours: pad(displayHours),
          minutes: pad(rawMinutes),
          seconds: pad(s),
          ampm
        });

        setDateString(dateFormatter.format(now));

        // CHECK ALARM
        // We check if alarm exists, is active, not already ringing
        // And if current time matches alarm time (HH:mm)
        // Also check seconds to trigger only once at the start of the minute (s === 0)
        // OR simply checking if we matched the minute allows for redundancy if frame is skipped,
        // but to prevent loop we check !isAlarmRinging.
        if (alarm && alarm.isActive && !isAlarmRinging) {
            const current24h = `${pad(rawHours)}:${pad(rawMinutes)}`;
            if (current24h === alarm.time && s === 0) {
                setIsAlarmRinging(true);
            }
        }
      }
      
      frameId = requestAnimationFrame(updateTime);
    };

    frameId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(frameId);
  }, [alarm, isAlarmRinging]);

  // --- ALARM SOUND LOOP ---
  useEffect(() => {
    let interval: any;
    if (isAlarmRinging && alarm) {
        // Play immediately
        playAlarmSound(alarm.soundType);
        // Then loop
        interval = setInterval(() => {
            playAlarmSound(alarm.soundType);
        }, 1000); // Pulse every second
    }
    return () => clearInterval(interval);
  }, [isAlarmRinging, alarm]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`
            );
            const weatherData = await weatherRes.json();
            
            let cityName = "Local Area";
            try {
                const geoRes = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                const geoData = await geoRes.json();
                cityName = geoData.city || geoData.locality || geoData.principalSubdivision || "Local Area";
            } catch (err) {
                console.warn("City fetch failed", err);
            }

            if (weatherData.current) {
              setWeather({
                temp: Math.round(weatherData.current.temperature_2m),
                code: weatherData.current.weather_code,
                city: cityName
              });
            }
          } catch (error) {
            console.error("Failed to fetch weather data", error);
          }
        },
        (error) => { 
            console.warn(`Geolocation lookup failed: ${error.message || 'Unknown error'}`); 
        },
        { enableHighAccuracy: false, timeout: 5000 } 
      );
    }
  }, []);

  const handleGenerateCharacter = async (name: string) => {
      const newTheme = await generateNewCharacterTheme(name);
      if (newTheme) {
          setThemes(prev => ({ ...prev, [newTheme.id]: newTheme }));
          setThemeId(newTheme.id);
      } else {
          alert("Could not generate character.");
      }
  };

  const handleSetAlarm = (timeStr: string, soundType: string) => {
      // timeStr comes from AI as HH:mm 24h format
      setAlarm({
          id: Date.now().toString(),
          time: timeStr,
          soundType: soundType as any,
          isActive: true
      });
  };

  const stopAlarm = () => {
      setIsAlarmRinging(false);
      setAlarm(null); // Clear alarm after it rings
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    }
  };

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${currentTheme.bgGradient} transition-colors duration-1000 flex flex-col items-center overflow-x-hidden relative`}>
      
      {/* Background Ambience */}
      <div className="fixed inset-0 opacity-30 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] bg-white rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-black rounded-full blur-[100px]"></div>
      </div>

      {/* Spider-Man Overlay - Always visible! */}
      <Spiderman />

      {/* ALARM OVERLAY */}
      {isAlarmRinging && alarm && (
          <AlarmOverlay 
            time={alarm.time} 
            characterName={currentTheme.name} 
            onStop={stopAlarm} 
          />
      )}

      {/* Fullscreen Toggle Button (Hidden in Screensaver mode) */}
      <button 
        onClick={toggleFullscreen}
        className={`fixed top-4 right-4 z-50 bg-black/30 hover:bg-black/50 text-white/50 hover:text-white p-2 rounded-full transition-all duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="Toggle Fullscreen"
      >
         {isFullscreen ? '⤓' : '⤢'}
      </button>

      <div className="z-10 w-full max-w-[1600px] flex flex-col items-center min-h-screen py-2 sm:py-6 px-4">
        
        {/* HEADER AREA - Hides on Idle */}
        <header className={`flex flex-col items-center w-full mb-4 lg:mb-8 flex-none pt-2 transition-opacity duration-1000 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <h1 className="text-white/95 font-display text-3xl sm:text-5xl tracking-[0.2em] mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] text-center">SPIDER-MAN FLIP CLOCK</h1>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-black/40 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/15 text-white font-sans text-sm sm:text-base mb-6 shadow-xl transition-all hover:bg-black/50 hover:scale-105">
                <div className="flex items-center gap-2 sm:border-r border-white/20 sm:pr-4">
                   <span className="opacity-90">📅</span>
                   <span className="font-bold tracking-wide uppercase">{dateString}</span>
                </div>
                {/* Alarm Status Indicator */}
                {alarm && alarm.isActive && (
                    <div className="flex items-center gap-2 text-red-400 font-bold sm:border-r border-white/20 sm:pr-4 animate-pulse">
                        <span>⏰</span>
                        <span>{alarm.time}</span>
                    </div>
                )}
                {weather ? (
                   <div className="flex items-center gap-3">
                      <span className="font-medium text-white/90">{weather.city}</span>
                      <div className="w-px h-4 bg-white/20 hidden sm:block"></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{getWeatherIcon(weather.code)}</span>
                        <span className="font-bold text-lg">{weather.temp}°</span>
                      </div>
                   </div>
                ) : (
                   <div className="flex items-center gap-2 opacity-60">
                      <span className="animate-pulse">📍</span>
                      <span className="text-xs">Locating...</span>
                   </div>
                )}
            </div>

            <CharacterSelector 
                currentThemeId={themeId} 
                themes={themes} 
                onSelect={setThemeId} 
                onAddClick={() => setIsModalOpen(true)}
            />
        </header>

        <div className="flex-1 w-full flex flex-col xl:flex-row items-center xl:items-start xl:justify-center gap-8 xl:gap-20 pb-10">
            
            {/* CLOCK AREA - Always Visible */}
            <div className={`flex flex-col items-center justify-center relative w-full xl:w-auto order-1 transition-all duration-1000 ${isIdle ? 'scale-110 xl:scale-125 translate-y-[10vh]' : ''}`}>
                
                <div className="h-14 sm:h-20 lg:h-24 relative pointer-events-none w-full flex justify-center -mb-2 z-20">
                    <div className="relative w-48 sm:w-64 h-full">
                         <div className="absolute bottom-0 left-0 text-5xl sm:text-6xl lg:text-7xl animate-bounce-slow" style={{ animationDelay: '0.2s' }}>
                            {currentTheme.emoji}
                         </div>
                         <div className="absolute bottom-0 right-0 text-5xl sm:text-6xl lg:text-7xl animate-bounce-high" style={{ animationDelay: '1.5s' }}>
                            {currentTheme.emoji}
                         </div>
                    </div>
                </div>

                {/* Clock Card Container */}
                <div className="relative p-2 sm:p-6 rounded-[2rem] flex justify-center">
                    
                    <div className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                        {/* HOURS */}
                        <div className="flex gap-1">
                            <FlipCard digit={time.hours[0] || '0'} animationClass={currentTheme.animationClass} />
                            <FlipCard digit={time.hours[1] || '0'} animationClass={currentTheme.animationClass} />
                        </div>
                        
                        {/* COLON */}
                        <div className="flex flex-col gap-2 sm:gap-4 px-1 pt-2">
                             <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                             <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                        </div>
                        
                        {/* MINUTES */}
                        <div className="flex gap-1">
                            <FlipCard digit={time.minutes[0] || '0'} animationClass={currentTheme.animationClass} />
                            <FlipCard digit={time.minutes[1] || '0'} animationClass={currentTheme.animationClass} />
                        </div>
                        
                        {/* COLON */}
                        <div className="hidden sm:flex flex-col gap-2 sm:gap-4 px-1 pt-2">
                             <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                             <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                        </div>

                        {/* SECONDS */}
                        <div className="hidden sm:flex gap-1">
                            <FlipCard digit={time.seconds[0] || '0'} animationClass={currentTheme.animationClass} isSeconds />
                            <FlipCard digit={time.seconds[1] || '0'} animationClass={currentTheme.animationClass} isSeconds />
                        </div>
                        
                        {/* AM/PM */}
                        <div className="ml-2 flex items-end pb-3 sm:pb-4">
                            <span className="text-lg sm:text-2xl lg:text-3xl font-display font-bold text-white tracking-widest drop-shadow-lg">
                                {time.ampm}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHAT AREA - Hides on Idle */}
            <div className={`w-full max-w-xl xl:w-[500px] xl:pt-16 order-2 px-2 sm:px-0 transition-opacity duration-1000 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isAlarmRinging ? 'z-[101] relative' : 'relative'}`}>
                 <ChatWidget 
                    theme={currentTheme} 
                    onCharacterSwitch={(newId) => setThemeId(newId)}
                    onSetAlarm={handleSetAlarm}
                    onStopAlarm={stopAlarm}
                 />
            </div>
        </div>

        <footer className={`w-full text-center p-4 mt-auto text-white/40 text-xs sm:text-sm font-sans tracking-wide transition-opacity duration-1000 ${isIdle ? 'opacity-0' : 'opacity-100'}`}>
          © 2026 Spider-Man Flip Clock
        </footer>
      </div>

      <AddCharacterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onGenerate={handleGenerateCharacter}
      />
    </div>
  );
};

export default App;
