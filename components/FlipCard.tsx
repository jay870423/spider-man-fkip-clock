
import React, { useState, useRef, memo } from 'react';

interface FlipCardProps {
  digit: string;
  animationClass: string;
  isSeconds?: boolean; 
}

export const FlipCard = memo(({ digit, animationClass, isSeconds }: FlipCardProps) => {
  const [animKey, setAnimKey] = useState(0);
  const [current, setCurrent] = useState(digit);
  const [prev, setPrev] = useState(digit);
  const isFirst = useRef(true);

  if (digit !== current) {
    if (isFirst.current) {
      isFirst.current = false;
      setCurrent(digit);
      setPrev(digit);
    } else {
      setPrev(current);
      setCurrent(digit);
      setAnimKey(prev => prev + 1);
    }
  }

  // Use faster animations for seconds to avoid visual lag on mobile
  const finalAnim = isSeconds ? 'animate-flip-down' : animationClass;
  
  // Dimensions for mobile scaling
  const sizeClasses = isSeconds 
    ? "w-10 h-16 sm:w-20 sm:h-32 md:w-24 md:h-40" 
    : "w-14 h-22 sm:w-28 sm:h-44 md:w-36 md:h-56 lg:w-44 lg:h-72";
  
  const textClasses = isSeconds
    ? "text-[3rem] sm:text-[5rem] md:text-[6rem]"
    : "text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem]";

  return (
    <div className={`relative ${sizeClasses} rounded-lg perspective-1000 bg-[#121212] shadow-2xl overflow-hidden`}>
      {/* Top Half Background */}
      <div className="absolute top-0 w-full h-1/2 bg-[#222] rounded-t-lg flex justify-center items-end overflow-hidden border-b border-black/40">
        <span className={`${textClasses} font-display text-white leading-none translate-y-1/2`}>{current}</span>
      </div>
      {/* Bottom Half Background */}
      <div className="absolute bottom-0 w-full h-1/2 bg-[#1a1a1a] rounded-b-lg flex justify-center items-start overflow-hidden">
        <span className={`${textClasses} font-display text-white leading-none -translate-y-1/2`}>{prev}</span>
      </div>
      {/* Animated Flap */}
      <div key={animKey} className={`absolute top-0 w-full h-1/2 origin-bottom transform-style-3d z-20 ${animKey > 0 ? finalAnim : ''}`}>
        <div className="absolute inset-0 backface-hidden bg-[#222] rounded-t-lg flex justify-center items-end overflow-hidden border-b border-black/40">
          <span className={`${textClasses} font-display text-white leading-none translate-y-1/2`}>{prev}</span>
        </div>
        <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] rounded-b-lg flex justify-center items-start overflow-hidden rotate-x-180">
          <span className={`${textClasses} font-display text-white leading-none -translate-y-1/2`}>{current}</span>
        </div>
      </div>
      {/* Hinge */}
      <div className="absolute top-1/2 w-full h-[1px] bg-black/60 z-30" />
    </div>
  );
});

FlipCard.displayName = 'FlipCard';
