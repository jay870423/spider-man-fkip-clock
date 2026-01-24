
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
    <div className="relative z-50 w-full flex justify-center py-2">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="
        flex gap-4 sm:gap-6 px-6 py-4
        bg-black/30 backdrop-blur-2xl rounded-[3rem] border border-white/20 shadow-2xl 
        overflow-x-auto max-w-[95vw] sm:max-w-4xl
        items-center
        no-scrollbar
      ">
        {Object.values(themes).map((theme: ThemeConfig) => {
          const isActive = currentThemeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`
                relative flex flex-col items-center justify-center transition-all duration-500 flex-shrink-0
                ${isActive ? 'scale-115 mx-3' : 'opacity-40 hover:opacity-100 hover:scale-105'}
              `}
            >
              <div className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 
                ${isActive ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.5)]' : 'border-white/10'} 
                transition-all bg-black/50 z-10
              `}>
                <img 
                  src={theme.avatarUrl} 
                  alt={theme.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${theme.name}`;
                  }}
                />
              </div>
              
              {isActive && (
                 <div className="absolute -bottom-2 bg-white text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-xl z-20 whitespace-nowrap">
                    {theme.name.split(' ')[0]}
                 </div>
              )}
            </button>
          );
        })}
        
        <button 
           onClick={onAddClick}
           className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 hover:text-white hover:border-white/60 hover:bg-white/10 transition-all group flex-shrink-0"
           title="Add Character"
        >
            <span className="text-3xl font-light group-hover:scale-125 transition-transform">+</span>
        </button>
      </div>
    </div>
  );
};
