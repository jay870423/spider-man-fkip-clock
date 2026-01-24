
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

  const finalAnim = isSeconds ? 'animate-flip-down' : animationClass;
  
  // Mobile Optimized Dimensions
  const sizeClasses = isSeconds 
    ? "w-[9vw] h-[14vw] sm:w-16 sm:h-28" 
    : "w-[18vw] h-[28vw] sm:w-28 sm:h-44 md:w-36 md:h-56 lg:w-44 lg:h-72";
  
  const textClasses = isSeconds
    ? "text-[6vw] sm:text-5xl"
    : "text-[16vw] sm:text-7xl md:text-8xl lg:text-[10rem]";

  return (
    <div className={`relative ${sizeClasses} rounded-[10%] perspective-1000 bg-[#121212] shadow-2xl overflow-hidden`}>
      <div className="absolute top-0 w-full h-1/2 bg-[#222] rounded-t-lg flex justify-center items-end overflow-hidden border-b border-black/40">
        <span className={`${textClasses} font-display text-white leading-none translate-y-1/2`}>{current}</span>
      </div>
      <div className="absolute bottom-0 w-full h-1/2 bg-[#1a1a1a] rounded-b-lg flex justify-center items-start overflow-hidden">
        <span className={`${textClasses} font-display text-white leading-none -translate-y-1/2`}>{prev}</span>
      </div>
      <div key={animKey} className={`absolute top-0 w-full h-1/2 origin-bottom transform-style-3d z-20 ${animKey > 0 ? finalAnim : ''}`}>
        <div className="absolute inset-0 backface-hidden bg-[#222] rounded-t-lg flex justify-center items-end overflow-hidden border-b border-black/40">
          <span className={`${textClasses} font-display text-white leading-none translate-y-1/2`}>{prev}</span>
        </div>
        <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] rounded-b-lg flex justify-center items-start overflow-hidden rotate-x-180">
          <span className={`${textClasses} font-display text-white leading-none -translate-y-1/2`}>{current}</span>
        </div>
      </div>
      <div className="absolute top-1/2 w-full h-[1px] bg-black/60 z-30" />
    </div>
  );
});

FlipCard.displayName = 'FlipCard';
