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
    <div className="relative z-50 mb-8 w-full flex justify-center">
      {/* Style to hide scrollbar visually while keeping functionality */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      <div className="
        flex gap-3 sm:gap-6 px-4 pt-4 pb-8
        bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-2xl 
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
                relative flex flex-col items-center justify-center transition-all duration-300 flex-shrink-0
                ${isActive ? 'scale-110 mx-2' : 'opacity-60 hover:opacity-100 hover:scale-105'}
              `}
            >
              <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 ${isActive ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent'} transition-all bg-black/20 z-10`}>
                <img src={theme.avatarUrl} alt={theme.name} className="w-full h-full object-cover" />
              </div>
              
              {isActive && (
                 <div className="absolute -bottom-7 sm:-bottom-8 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg animate-bounce whitespace-nowrap z-20">
                    Selected
                 </div>
              )}
            </button>
          );
        })}
        
        {/* "Add" Button */}
        <button 
           onClick={onAddClick}
           className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 hover:text-white hover:border-white/60 hover:bg-white/5 transition-all group flex-shrink-0"
           title="Create New Character"
        >
            <span className="text-2xl font-light group-hover:scale-110 transition-transform">+</span>
        </button>
      </div>
    </div>
  );
};