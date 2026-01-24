
// Track audio context and oscillators for mood music and alerts
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentOscillators: { stop: () => void }[] = [];

/**
 * Lazily initialize the AudioContext and ensure it's connected to destination.
 */
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime); // Standard volume
  }
  return audioCtx;
};

/**
 * Stops all active oscillators and clears active timers/intervals.
 */
export const stopAllSounds = () => {
  currentOscillators.forEach(item => {
    try { item.stop(); } catch(e) {}
  });
  currentOscillators = [];
};

export const stopAmbientMusic = () => {
  stopAllSounds();
};

/**
 * Plays sophisticated synthesized background music based on a provided mood.
 * Designed to be audible even on small speakers.
 */
export const playMoodBackground = async (mood: string) => {
  const ctx = getAudioContext();
  
  // CRITICAL: Browsers block AudioContext until a user click resumes it.
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  stopAllSounds();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(masterGain!);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 1.5); // Fade in

  if (mood === 'cheerful') {
    // Cheerful: Bouncy Arpeggio (C Major 7)
    const freqs = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const subGain = ctx.createGain();
      osc.type = 'triangle'; // Richer than sine
      osc.frequency.setValueAtTime(f, now);
      
      // Create a rhythmic sequence
      const startTime = now + (i * 0.2);
      subGain.gain.setValueAtTime(0, now);
      subGain.gain.setTargetAtTime(0.15, startTime, 0.1);
      
      osc.connect(subGain);
      subGain.connect(gain);
      osc.start(now);
      currentOscillators.push(osc);
    });
  } else if (mood === 'focus') {
    // Focus: Minimalist Techno Pulse
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(110, now); // A2
    drone.connect(gain);
    drone.start(now);
    currentOscillators.push(drone);

    const pulseInterval = window.setInterval(() => {
        if (!audioCtx) return;
        const time = audioCtx.currentTime;
        const p = audioCtx.createOscillator();
        const pg = audioCtx.createGain();
        p.type = 'square';
        p.frequency.setValueAtTime(220, time);
        pg.gain.setValueAtTime(0.08, time);
        pg.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        p.connect(pg);
        pg.connect(gain);
        p.start(time);
        p.stop(time + 0.1);
    }, 500); // 120 BPM pulse
    currentOscillators.push({ stop: () => clearInterval(pulseInterval) });
  } else if (mood === 'calm' || mood === 'neutral') {
    // Calm: Floating sine pads with a bit of detune for "shimmer"
    [261.63, 262.63, 392.00].forEach(f => {
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
  } else if (mood === 'supportive') {
    // Supportive: Warm "Music Box" style tones
    const melody = [523.25, 659.25, 783.99, 880.00]; // C5, E5, G5, A5
    const melodyTimer = window.setInterval(() => {
        if (!audioCtx) return;
        const time = audioCtx.currentTime;
        const f = melody[Math.floor(Math.random() * melody.length)];
        const osc = audioCtx.createOscillator();
        const mg = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, time);
        mg.gain.setValueAtTime(0.2, time);
        mg.gain.exponentialRampToValueAtTime(0.001, time + 2);
        osc.connect(mg);
        mg.connect(gain);
        osc.start(time);
        osc.stop(time + 2);
    }, 1000);
    currentOscillators.push({ stop: () => clearInterval(melodyTimer) });
  }
};

/**
 * Plays ambient vibes based on the time of day.
 */
export const playContextualVibe = async (context: 'morning' | 'afternoon' | 'night') => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  stopAllSounds();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(masterGain!);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 2);

  if (context === 'morning') {
    playMoodBackground('cheerful');
  } else if (context === 'afternoon') {
    playMoodBackground('focus');
  } else {
    playMoodBackground('calm');
  }
};

export const playAlarmSound = (type: string) => {
    const hour = new Date().getHours();
    let ctx: 'morning' | 'afternoon' | 'night' = 'night';
    if (hour >= 5 && hour < 11) ctx = 'morning';
    else if (hour >= 11 && hour < 17) ctx = 'afternoon';
    playContextualVibe(ctx);
};
