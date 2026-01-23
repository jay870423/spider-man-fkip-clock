
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-display text-white tracking-wide mb-6 flex items-center gap-3">
           <span className="text-xl">⚙️</span> Settings
        </h2>

        <div className="space-y-8">
          {/* Auto Screensaver Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Screensaver Mode</h3>
              <p className="text-white/40 text-xs">Hide UI after a period of inactivity</p>
            </div>
            <button 
              onClick={() => setAutoScreensaver(!autoScreensaver)}
              className={`w-12 h-6 rounded-full transition-colors relative ${autoScreensaver ? 'bg-blue-600' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoScreensaver ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          {/* Idle Delay Slider */}
          <div className={`space-y-3 transition-opacity ${autoScreensaver ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Idle Timeout</span>
              <span className="text-blue-400 font-bold">{idleDelay} seconds</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="120" 
              step="5"
              value={idleDelay}
              onChange={(e) => setIdleDelay(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-tighter">
              <span>5s</span>
              <span>2m</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
             <button 
                onClick={onClose}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all border border-white/10"
             >
                Close
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
