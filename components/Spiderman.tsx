import React, { useState, useEffect, useRef } from 'react';

export const Spiderman: React.FC = () => {
  // Container dimensions
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  
  // Refs for physics state to avoid re-renders during animation loop
  // Target: Where the ceiling anchor wants to go
  const targetPos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300 });
  
  // Current: Where the objects actually are
  const anchorPos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: 0 }); // Ceiling point
  const spiderPos = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight * 0.3 : 300 }); // Spider body
  const velocity = useRef({ x: 0, y: 0, rot: 0 });
  const rotation = useRef(0);

  // Refs for DOM elements to manipulate directly
  const lineRef = useRef<SVGLineElement>(null);
  const spiderRef = useRef<HTMLDivElement>(null);
  const webClusterRef = useRef<SVGGElement>(null);

  const SPIDER_SIZE = 140;

  useEffect(() => {
    setDimensions({ w: window.innerWidth, h: window.innerHeight });
    
    // Initial random position
    targetPos.current = { 
        x: Math.random() * window.innerWidth, 
        y: (Math.random() * 0.4 + 0.1) * window.innerHeight 
    };

    const handleResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- PHYSICS LOOP ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    // Configuration
    const SPRING = 0.05; // Stiffness of the web
    const DAMPING = 0.92; // Air resistance (higher = slippery, lower = thick air)
    const CEILING_SPEED = 0.02; // How fast the ceiling anchor moves to target

    const loop = (time: number) => {
      // Delta time (clamp to avoid huge jumps)
      const dt = Math.min((time - lastTime) / 16, 2); 
      lastTime = time;

      // 1. Move Ceiling Anchor towards Target (Linear-ish interpolation)
      // This simulates the "motor" or the spider running on the ceiling
      const dxAnchor = targetPos.current.x - anchorPos.current.x;
      anchorPos.current.x += dxAnchor * CEILING_SPEED * dt;

      // 2. Physics for Spiderman Body (Spring attached to Anchor)
      // Force = Distance * Spring
      const distX = anchorPos.current.x - spiderPos.current.x;
      const distY = targetPos.current.y - spiderPos.current.y; // Height is controlled by target Y

      // Add forces to velocity
      velocity.current.x += distX * SPRING * dt;
      velocity.current.y += distY * SPRING * dt;

      // Apply friction/damping
      velocity.current.x *= DAMPING;
      velocity.current.y *= DAMPING;

      // Update positions
      spiderPos.current.x += velocity.current.x * dt;
      spiderPos.current.y += velocity.current.y * dt;

      // 3. Calculate Rotation based on swing angle (pendulum physics approximation)
      // We want rotation to be negative when swinging right (bottom lags left)
      const swingX = spiderPos.current.x - anchorPos.current.x;
      const targetRotation = -(swingX * 0.5); // Multiplier for drama
      
      // Smooth rotation
      const dRot = targetRotation - rotation.current;
      rotation.current += dRot * 0.1 * dt;

      // --- RENDER UPDATES (Direct DOM) ---
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

  // --- BEHAVIOR LOOP ---
  useEffect(() => {
    const moveInterval = setInterval(() => {
        // Pick new random target
        // Responsive Logic: Ensure he swings in view
        const margin = window.innerWidth * 0.1;
        const w = window.innerWidth - margin * 2;
        
        targetPos.current = {
            x: margin + Math.random() * w,
            y: (Math.random() * 0.3 + 0.15) * window.innerHeight // Random height 15% to 45%
        };
    }, 4000); // Change target every 4s

    return () => clearInterval(moveInterval);
  }, []);

  // Interaction: Push him
  const handleInteract = () => {
     // Add random velocity impulse
     velocity.current.x += (Math.random() - 0.5) * 50;
     velocity.current.y -= 20; // Jump up
     
     // Change target immediately
     targetPos.current = {
         x: Math.random() * window.innerWidth,
         y: Math.random() * window.innerHeight * 0.4
     };
  };

  return (
    // Increased z-index to z-[60] to sit above z-50 elements like modals or selectors
    <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
            <filter id="web-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
        </defs>

        {/* The Silk Thread */}
        <line 
            ref={lineRef}
            stroke="rgba(255,255,255,0.9)" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            filter="url(#web-glow)"
            className="transition-colors duration-300"
        />
        
        {/* Ceiling Web Patch */}
        <g ref={webClusterRef}>
            {/* A messy web cluster at the anchor point */}
            <path d="M-10 0 L10 0 L0 15 Z" fill="white" opacity="0.8" />
            <line x1="-15" y1="0" x2="15" y2="5" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="-5" y1="0" x2="-10" y2="10" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="12" y1="0" x2="5" y2="12" stroke="white" strokeWidth="1" opacity="0.5" />
            <circle cx="0" cy="0" r="4" fill="white" />
        </g>
      </svg>

      {/* Spiderman Character */}
      {/* 
          Note: We use style.transform for position to avoid React render cycles.
          Initial position is off-screen or 0,0 until the loop picks it up.
       */}
      <div 
        ref={spiderRef}
        className="absolute top-0 left-0 pointer-events-auto cursor-pointer touch-manipulation will-change-transform"
        onClick={handleInteract}
        style={{ width: SPIDER_SIZE, height: SPIDER_SIZE }}
      >
         {/* Upside down image for hanging effect */}
         <img 
            src="https://pngimg.com/uploads/spider_man/spider_man_PNG98.png" 
            alt="Spiderman" 
            className="w-full h-full object-contain rotate-180 hover:scale-105 transition-transform duration-200 drop-shadow-xl"
            style={{ 
                filter: 'drop-shadow(0px -5px 10px rgba(0,0,0,0.5))' // Shadow upwards because he's upside down
            }} 
        />
        {/* Connection point visual aid (hands/feet area) */}
        <div className="absolute top-[85%] left-1/2 -translate-x-1/2 w-2 h-2 bg-white/0"></div>
      </div>
    </div>
  );
};