
import React from 'react';
import { CharacterId, ThemeConfig } from '../types';

interface Props {
  currentThemeId: CharacterId;
  themes: Record<string, ThemeConfig>;
  onSelect: (id: CharacterId) => void;
  onAddClick: () => void;
}

export const CharacterSelector: React.FC<Props> = ({ currentThemeId, themes, onSelect, onAddClick }) => {
  return (
    <div className="relative z-[50] w-full flex justify-center py-4">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="
        flex gap-5 sm:gap-8 px-8 py-5
        bg-black/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] 
        overflow-x-auto max-w-[92vw] sm:max-w-4xl
        items-center no-scrollbar
      ">
        {Object.values(themes).map((theme: ThemeConfig) => {
          const isActive = currentThemeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`
                relative flex flex-col items-center justify-center transition-all duration-500 flex-shrink-0
                ${isActive ? 'scale-125 mx-4' : 'opacity-40 hover:opacity-100 hover:scale-110'}
              `}
            >
              <div className={`
                w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 
                ${isActive ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.6)]' : 'border-white/20'} 
                transition-all bg-black/60 z-10
              `}>
                <img 
                  src={theme.avatarUrl} 
                  alt={theme.name} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to a stable avatar source if current fails
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${theme.name}&backgroundColor=b6e3f4`;
                  }}
                />
              </div>
              
              {isActive && (
                 <div className="absolute -bottom-3 bg-white text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-2xl z-20 whitespace-nowrap animate-fade-in-up">
                    {theme.name.split(' ')[0]}
                 </div>
              )}
            </button>
          );
        })}
        
        <button 
           onClick={onAddClick}
           className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 hover:text-white hover:border-white/80 hover:bg-white/10 transition-all group flex-shrink-0"
           title="Add Character"
        >
            <span className="text-3xl font-thin group-hover:scale-150 transition-transform">+</span>
        </button>
      </div>
    </div>
  );
};
