import React from 'react';

interface Props {
  time: string;
  onStop: () => void;
  characterName: string;
}

export const AlarmOverlay: React.FC<Props> = ({ time, onStop, characterName }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl transition-all animate-pulse-slow">
      {/* Background Red Flash Animation Layer */}
      <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="text-white font-display text-[12rem] leading-none drop-shadow-[0_0_50px_rgba(255,0,0,0.6)] tracking-widest animate-bounce-slow">
          {time}
        </div>
        
        <div className="text-white/90 font-sans text-3xl mb-16 uppercase tracking-widest font-bold drop-shadow-lg text-center px-4">
          <span className="text-red-500">{characterName}</span> SAYS WAKE UP!
        </div>
        
        <button 
          onClick={onStop}
          className="group relative px-16 py-6 bg-white text-black font-black text-2xl rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 transition-transform overflow-hidden"
        >
          <span className="relative z-10 uppercase tracking-[0.2em]">STOP ALARM</span>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
        </button>
      </div>
    </div>
  );
};