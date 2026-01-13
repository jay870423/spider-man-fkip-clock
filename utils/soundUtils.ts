
// A simple audio synthesizer to avoid external dependencies
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const playAlarmSound = (type: string) => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;

  if (type === 'nature') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Bird chirp simulation
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);

    // Echo/second chirp
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now + 0.3);
    osc2.frequency.linearRampToValueAtTime(1500, now + 0.4);
    gain2.gain.setValueAtTime(0, now + 0.3);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.35);
    gain2.gain.linearRampToValueAtTime(0, now + 0.5);
    osc2.start(now + 0.3);
    osc2.stop(now + 0.5);

  } else if (type === 'energetic') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Fast high-pitch pulses
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1200, now + 0.1);
    osc.frequency.setValueAtTime(800, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.setValueAtTime(0.3, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  } else if (type === 'classical') {
    // Music Box Style - Pentatonic Scale Arpeggio (Asian Pop feel)
    // Notes: C5, D5, E5, G5 (Pentatonic major)
    const notes = [523.25, 587.33, 659.25, 783.99]; 
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Staggered start times to create an arpeggio (0s, 0.2s, 0.4s, 0.6s)
        // Since loop is 1s, we fit 4 notes nicely.
        const start = now + (i * 0.2);
        
        osc.type = 'sine'; // Sine waves sound pure like a music box
        osc.frequency.value = freq;
        
        // Envelope: Quick attack, long decay
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.8); 
        
        osc.start(start);
        osc.stop(start + 1.0); // Allow tail to ring out
    });

  } else {
    // Default 'digital' beep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.linearRampToValueAtTime(880, now + 0.1); // Slide up
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }
};
