
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
  
  // Refined Responsive Sizes for better mobile compatibility
  // Width: Mobile ~60-70px, Desktop up to 200px
  const cardWidth = isSeconds ? "w-[clamp(35px,8vw,80px)]" : "w-[clamp(65px,20vw,200px)]";
  const cardHeight = isSeconds ? "h-[clamp(50px,12vw,120px)]" : "h-[clamp(100px,28vw,300px)]";
  const fontSize = isSeconds ? "text-[clamp(1.2rem,5vw,4rem)]" : "text-[clamp(3rem,16vw,12rem)]";

  return (
    <div className={`relative ${cardWidth} ${cardHeight} rounded-[12%] perspective-1000 bg-[#0a0a0a] shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden border border-white/5`}>
      {/* Upper Half */}
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#1a1a1a] to-[#121212] rounded-t-lg flex justify-center items-end overflow-hidden border-b border-black/80">
        <span className={`${fontSize} font-display text-white leading-none translate-y-1/2 drop-shadow-lg`}>{current}</span>
      </div>
      
      {/* Lower Half */}
      <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#121212] to-[#161616] rounded-b-lg flex justify-center items-start overflow-hidden">
        <span className={`${fontSize} font-display text-white leading-none -translate-y-1/2 drop-shadow-lg`}>{prev}</span>
      </div>

      {/* Flipping Layer */}
      <div key={animKey} className={`absolute top-0 w-full h-1/2 origin-bottom transform-style-3d z-20 ${animKey > 0 ? finalAnim : ''}`}>
        <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] rounded-t-lg flex justify-center items-end overflow-hidden border-b border-black/80">
          <span className={`${fontSize} font-display text-white leading-none translate-y-1/2`}>{prev}</span>
        </div>
        <div className="absolute inset-0 backface-hidden bg-[#161616] rounded-b-lg flex justify-center items-start overflow-hidden rotate-x-180">
          <span className={`${fontSize} font-display text-white leading-none -translate-y-1/2`}>{current}</span>
        </div>
      </div>
      
      {/* Hinge Line */}
      <div className="absolute top-1/2 w-full h-[2px] bg-black/80 z-30 shadow-[0_1px_2px_rgba(255,255,255,0.05)]" />
    </div>
  );
});

FlipCard.displayName = 'FlipCard';
