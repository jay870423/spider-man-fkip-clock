
// Track audio context and oscillators for mood music and alerts
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentOscillators: { stop: () => void }[] = [];

/**
 * Lazily initialize the AudioContext.
 */
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
};

/**
 * Stops all active oscillators and clears active timers/intervals.
 */
export const stopAllSounds = () => {
  currentOscillators.forEach(osc => {
    try { osc.stop(); } catch(e) {}
  });
  currentOscillators = [];
};

/**
 * Stop any ambient music currently playing.
 * Fixes: ChatWidget import error.
 */
export const stopAmbientMusic = () => {
  stopAllSounds();
};

/**
 * Plays background music based on a provided mood.
 * Fixes: ChatWidget import error.
 * @param mood 'neutral' | 'calm' | 'cheerful' | 'focus' | 'supportive'
 */
export const playMoodBackground = (mood: string) => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  stopAllSounds();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(masterGain!);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 2); // 2-second fade in

  if (mood === 'cheerful') {
    // Cheerful: Bright major scale sequence
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(gain);
      osc.start(now);
      currentOscillators.push(osc);
    });
  } else if (mood === 'focus') {
    // Focus: Steady triangle wave drone with rhythmic pulses
    const drone = ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.setValueAtTime(146.83, now); // D3
    drone.connect(gain);
    drone.start(now);
    currentOscillators.push(drone);

    const pulseTimer = window.setInterval(() => {
        if (!audioCtx) return;
        const p = audioCtx.createOscillator();
        const pg = audioCtx.createGain();
        p.connect(pg); pg.connect(gain);
        p.frequency.setValueAtTime(440, audioCtx.currentTime);
        pg.gain.setValueAtTime(0.05, audioCtx.currentTime);
        pg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        p.start(); p.stop(audioCtx.currentTime + 0.3);
    }, 2000);
    currentOscillators.push({ stop: () => clearInterval(pulseTimer) });
  } else if (mood === 'supportive') {
    // Supportive: Warm sine wave pads using an F Major chord
    const warmFreqs = [174.61, 220.00, 261.63]; 
    warmFreqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.04, now);
      osc.connect(subGain);
      subGain.connect(gain);
      osc.start(now);
      currentOscillators.push(osc);
    });
  } else {
    // Calm/Neutral: Soft deep drone (default)
    const lowFreqs = [73.42, 110, 146.83]; // Deep D tones
    lowFreqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.03, now);
      osc.connect(subGain);
      subGain.connect(gain);
      osc.start(now);
      currentOscillators.push(osc);
    });
  }
};

/**
 * Plays ambient vibes based on the time of day.
 * @param context 'morning' | 'afternoon' | 'night'
 */
export const playContextualVibe = (context: 'morning' | 'afternoon' | 'night') => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  stopAllSounds();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(masterGain!);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 2); // 2-second fade in

  if (context === 'morning') {
    // 清晨：明亮的大调音阶 + 模拟鸟鸣
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      lfo.frequency.setValueAtTime(0.5 + i * 0.2, now);
      lfoGain.gain.setValueAtTime(0.05, now);
      lfo.connect(lfoGain.gain);
      osc.connect(lfoGain);
      lfoGain.connect(gain);
      osc.start(now);
      lfo.start(now);
      currentOscillators.push(osc, lfo);
    });
  } else if (context === 'afternoon') {
    // 午后：Lo-fi 节奏感（模拟极简节拍）
    const drone = ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.setValueAtTime(146.83, now); // D3
    drone.connect(gain);
    drone.start(now);
    currentOscillators.push(drone);

    // 每隔1.5秒的一个软脉冲
    const pulseTimer = window.setInterval(() => {
        if (!audioCtx) return;
        const p = audioCtx.createOscillator();
        const pg = audioCtx.createGain();
        p.connect(pg); pg.connect(gain);
        p.frequency.setValueAtTime(440, audioCtx.currentTime);
        pg.gain.setValueAtTime(0.1, audioCtx.currentTime);
        pg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        p.start(); p.stop(audioCtx.currentTime + 0.5);
    }, 1500);
    currentOscillators.push({ stop: () => clearInterval(pulseTimer) });
  } else {
    // 夜晚：深沉的低频 + 柔和的波浪声
    const lowFreqs = [73.42, 110, 146.83]; // Deep D
    lowFreqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.05, now);
      osc.connect(subGain);
      subGain.connect(gain);
      osc.start(now);
      currentOscillators.push(osc);
    });
  }
};

export const playAlarmSound = (type: string) => {
    // 兼容旧逻辑，实际将被 playContextualVibe 取代
    const hour = new Date().getHours();
    let ctx: 'morning' | 'afternoon' | 'night' = 'night';
    if (hour >= 5 && hour < 11) ctx = 'morning';
    else if (hour >= 11 && hour < 17) ctx = 'afternoon';
    playContextualVibe(ctx);
};
