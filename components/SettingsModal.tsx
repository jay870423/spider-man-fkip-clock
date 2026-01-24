
import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  autoScreensaver: boolean;
  setAutoScreensaver: (val: boolean) => void;
  idleDelay: number;
  setIdleDelay: (val: number) => void;
}

export const SettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  autoScreensaver, 
  setAutoScreensaver, 
  idleDelay, 
  setIdleDelay 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
        >
          ✕
        </button>

        <h2 className="text-3xl font-display text-white tracking-widest mb-8 flex items-center gap-4">
           <span className="text-2xl opacity-80">⚙️</span> SETTINGS
        </h2>

        <div className="space-y-10">
          {/* Auto Screensaver Toggle */}
          <div className="flex items-center justify-between group">
            <div className="pr-4">
              <h3 className="text-white font-black text-sm uppercase tracking-wider group-hover:text-blue-400 transition-colors">Auto Screensaver</h3>
              <p className="text-white/30 text-[10px] mt-1 leading-relaxed">Automatically enter minimalist clock mode when the system is idle.</p>
            </div>
            <button 
              onClick={() => setAutoScreensaver(!autoScreensaver)}
              className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${autoScreensaver ? 'bg-blue-600' : 'bg-white/5'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${autoScreensaver ? 'left-8' : 'left-1'}`}></div>
            </button>
          </div>

          {/* Idle Delay Slider */}
          <div className={`space-y-4 transition-all duration-500 ${autoScreensaver ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-2 pointer-events-none'}`}>
            <div className="flex justify-between items-end">
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">Idle Wait Time</span>
              <span className="text-blue-400 font-display text-2xl leading-none">{idleDelay}s</span>
            </div>
            <div className="relative h-6 flex items-center">
              <input 
                type="range" 
                min="5" 
                max="120" 
                step="5"
                value={idleDelay}
                onChange={(e) => setIdleDelay(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/20 font-black tracking-widest uppercase">
              <span>5s (Fast)</span>
              <span>120s</span>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
             <button 
                onClick={onClose}
                className="w-full py-4 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-400 hover:text-white transform active:scale-95 transition-all shadow-xl"
             >
                Confirm & Close
             </button>
          </div>
          
          <div className="text-center">
            <p className="text-white/10 text-[9px] font-bold uppercase tracking-widest">Flip Clock v2.5 Desktop Edition</p>
          </div>
        </div>
      </div>
    </div>
  );
};
