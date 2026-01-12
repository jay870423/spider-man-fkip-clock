import React, { useState, useRef, memo } from 'react';

interface FlipCardProps {
  digit: string;
  animationClass: string;
  isSeconds?: boolean; 
}

export const FlipCard = memo(({ 
  digit, 
  animationClass,
  isSeconds
}: FlipCardProps) => {
  const [animKey, setAnimKey] = useState(0);
  const [currentDisplay, setCurrentDisplay] = useState(digit); // The value we are transitioning TO
  const [prevDisplay, setPrevDisplay] = useState(digit);       // The value we are transitioning FROM
  
  const isFirstRender = useRef(true);

  if (digit !== currentDisplay) {
     if (isFirstRender.current) {
        isFirstRender.current = false;
        setCurrentDisplay(digit);
        setPrevDisplay(digit);
     } else {
        setPrevDisplay(currentDisplay);
        setCurrentDisplay(digit);
        setAnimKey(prev => prev + 1);
     }
  }

  // --- PHYSICS & LOGIC ---
  // Standard "Flip Down" Clock:
  // 1. Static Top: Shows NEXT digit (Top Half).
  // 2. Static Bottom: Shows CURRENT digit (Bottom Half).
  // 3. Flap:
  //    - Front: CURRENT digit (Top Half).
  //    - Back: NEXT digit (Bottom Half).
  //    - Anim: Rotates 0 -> -180deg (Top falls down).

  // Force seconds to be fast (0.6s) even if the theme is slow, 
  // otherwise seconds will overlap and look broken.
  const finalAnimationClass = isSeconds ? 'animate-flip-down' : animationClass;

  // Colors
  const bgTop = "bg-[#2a2a2a]";
  const bgBottom = "bg-[#242424]"; 
  const textColor = "text-[#e0e0e0]";
  const fontStack = { fontFamily: '"Bebas Neue", Arial, sans-serif' };
  const textSizeClasses = "text-[4.5rem] sm:text-[6rem] md:text-[8rem] lg:text-[9.5rem] leading-none"; 

  return (
    <div className="flex flex-col items-center mx-[1px] sm:mx-2 relative z-0">
      <div className={`
        relative 
        w-16 h-24        /* Mobile */
        sm:w-28 sm:h-44  /* Tablet */
        md:w-36 md:h-56  /* Desktop */
        lg:w-44 lg:h-72  /* Large */
        rounded-lg sm:rounded-xl perspective-1000 shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#1a1a1a]
      `}>
        
        {/* --- STATIC TOP (Background) --- */}
        {/* Shows NEXT Digit Top Half. Visible immediately behind the flap. */}
        <div className={`absolute top-0 left-0 w-full h-1/2 ${bgTop} rounded-t-lg sm:rounded-t-xl overflow-hidden z-0 border-b border-black/30`}>
          <div className="relative w-full h-full overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[200%] flex justify-center items-center">
                <span className={`${textColor} font-bold select-none ${textSizeClasses}`} style={fontStack}>
                    {currentDisplay}
                </span>
             </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
        </div>

        {/* --- STATIC BOTTOM (Background) --- */}
        {/* Shows CURRENT Digit Bottom Half. Visible until covered by falling flap. */}
        <div className={`absolute bottom-0 left-0 w-full h-1/2 ${bgBottom} rounded-b-lg sm:rounded-b-xl overflow-hidden z-0`}>
           <div className="relative w-full h-full overflow-hidden">
              <div className="absolute -top-[100%] left-0 w-full h-[200%] flex justify-center items-center">
                <span className={`${textColor} font-bold select-none ${textSizeClasses}`} style={fontStack}>
                  {prevDisplay}
                </span>
              </div>
           </div>
           <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>

        {/* --- THE FLAP (Animation) --- */}
        <div 
           key={animKey} 
           className={`absolute top-0 left-0 w-full h-1/2 z-20 origin-bottom transform-style-3d ${animKey > 0 ? finalAnimationClass : ''}`}
        >
             {/* FLAP FRONT: Shows CURRENT Digit Top Half. 
                 Visible at start (0deg). Disappears at -90deg. */}
             <div className={`absolute inset-0 backface-hidden ${bgTop} rounded-t-lg sm:rounded-t-xl overflow-hidden border-b border-black/30`}>
                 <div className="relative w-full h-full overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[200%] flex justify-center items-center">
                        <span className={`${textColor} font-bold select-none ${textSizeClasses}`} style={fontStack}>
                            {prevDisplay}
                        </span>
                    </div>
                 </div>
                 {/* Shadow grows as it falls away from light */}
                 <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
             </div>

             {/* FLAP BACK: Shows NEXT Digit Bottom Half. 
                 Visible at end (-180deg). Pre-rotated so it lands correctly. */}
             <div 
                className={`absolute inset-0 backface-hidden ${bgBottom} rounded-b-lg sm:rounded-b-xl overflow-hidden border-t border-black/30`}
                style={{ transform: 'rotateX(180deg)' }}
             >
                 <div className="relative w-full h-full overflow-hidden">
                    <div className="absolute -top-[100%] left-0 w-full h-[200%] flex justify-center items-center">
                        <span className={`${textColor} font-bold select-none ${textSizeClasses}`} style={fontStack}>
                            {currentDisplay}
                        </span>
                    </div>
                 </div>
                 {/* Highlight as it faces up */}
                 <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent"></div>
             </div>
         </div>
         
         {/* Hinge Line / Mechanical details */}
         <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#111] z-30 transform -translate-y-1/2 shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
      </div>
    </div>
  );
});

FlipCard.displayName = 'FlipCard';