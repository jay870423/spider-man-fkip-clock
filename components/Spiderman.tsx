
import React, { useState, useEffect, useRef } from 'react';

export const Spiderman: React.FC = () => {
  // Container dimensions
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  
  // Refs for physics state to avoid re-renders during animation loop
  const targetPos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300 });
  const anchorPos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: 0 }); // Ceiling point
  const spiderPos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300 }); // Spider body
  const velocity = useRef({ x: 0, y: 0, rot: 0 });
  const rotation = useRef(0);

  // Refs for DOM elements to manipulate directly
  const lineRef = useRef<SVGLineElement>(null);
  const spiderRef = useRef<HTMLDivElement>(null);
  const webClusterRef = useRef<SVGGElement>(null);

  const SPIDER_SIZE = 120; // Slightly smaller

  useEffect(() => {
    setDimensions({ w: window.innerWidth, h: window.innerHeight });
    
    targetPos.current = { 
        x: Math.random() * window.innerWidth, 
        y: (Math.random() * 0.4 + 0.1) * window.innerHeight 
    };

    const handleResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const SPRING = 0.05; 
    const DAMPING = 0.92; 
    const CEILING_SPEED = 0.02; 

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 2); 
      lastTime = time;

      const dxAnchor = targetPos.current.x - anchorPos.current.x;
      anchorPos.current.x += dxAnchor * CEILING_SPEED * dt;

      const distX = anchorPos.current.x - spiderPos.current.x;
      const distY = targetPos.current.y - spiderPos.current.y; 

      velocity.current.x += distX * SPRING * dt;
      velocity.current.y += distY * SPRING * dt;

      velocity.current.x *= DAMPING;
      velocity.current.y *= DAMPING;

      spiderPos.current.x += velocity.current.x * dt;
      spiderPos.current.y += velocity.current.y * dt;

      const swingX = spiderPos.current.x - anchorPos.current.x;
      const targetRotation = -(swingX * 0.5); 
      
      const dRot = targetRotation - rotation.current;
      rotation.current += dRot * 0.1 * dt;

      if (lineRef.current) {
        lineRef.current.setAttribute('x1', String(anchorPos.current.x));
        lineRef.current.setAttribute('y1', '0');
        lineRef.current.setAttribute('x2', String(spiderPos.current.x));
        lineRef.current.setAttribute('y2', String(spiderPos.current.y));
      }

      if (webClusterRef.current) {
        webClusterRef.current.setAttribute('transform', `translate(${anchorPos.current.x}, 0)`);
      }

      if (spiderRef.current) {
        spiderRef.current.style.transform = `translate(${spiderPos.current.x - SPIDER_SIZE/2}px, ${spiderPos.current.y}px) rotate(${rotation.current}deg)`;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const moveInterval = setInterval(() => {
        const margin = window.innerWidth * 0.1;
        const w = window.innerWidth - margin * 2;
        targetPos.current = {
            x: margin + Math.random() * w,
            y: (Math.random() * 0.3 + 0.15) * window.innerHeight 
        };
    }, 5000); 

    return () => clearInterval(moveInterval);
  }, []);

  const handleInteract = () => {
     velocity.current.x += (Math.random() - 0.5) * 60;
     velocity.current.y -= 30; 
     targetPos.current = {
         x: Math.random() * window.innerWidth,
         y: Math.random() * window.innerHeight * 0.4
     };
  };

  return (
    // Lowered z-index to 40 so he doesn't block character selector or chat
    <div className="absolute inset-0 pointer-events-none z-[40] overflow-hidden">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
            <filter id="web-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
        </defs>

        <line 
            ref={lineRef}
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="1.5" 
            strokeLinecap="round"
            filter="url(#web-glow)"
        />
        
        <g ref={webClusterRef}>
            <circle cx="0" cy="0" r="3" fill="white" opacity="0.6" />
        </g>
      </svg>

      <div 
        ref={spiderRef}
        className="absolute top-0 left-0 pointer-events-auto cursor-pointer touch-manipulation will-change-transform"
        onClick={handleInteract}
        style={{ width: SPIDER_SIZE, height: SPIDER_SIZE }}
      >
         <img 
            src="https://pngimg.com/uploads/spider_man/spider_man_PNG98.png" 
            alt="Spiderman" 
            className="w-full h-full object-contain rotate-180 hover:scale-105 transition-transform duration-200"
            style={{ filter: 'drop-shadow(0px -5px 10px rgba(0,0,0,0.5))' }} 
        />
      </div>
    </div>
  );
};
