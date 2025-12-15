import React, { useState } from 'react';

interface CoffeePropProps {
  scale?: number;
  smokeSize?: number; // width/height of smoke SVG (default 80)
  smokeOffsetY?: number; // negative px offset above cup (default -28)
  smokeIntensity?: number; // 0-1 multiplier for smoke opacity (default 1)
}

export default function CoffeeProp({
  scale = 0.75,
  smokeSize = 75,
  smokeOffsetY = -75,
  smokeIntensity = 2,
}: CoffeePropProps) {
  const [hover, setHover] = useState(false);
  // Clamp intensity
  const intensity = Math.max(0, Math.min(smokeIntensity, 1));
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        console.log('coffee-clicked');
      }}
      className={`absolute bottom-6 left-12 cursor-pointer transition-transform duration-150 ease-out`}
      style={{
        transform: `${hover ? 'translateY(-1px)' : 'translateY(0)'} rotate(-2deg) scale(${hover ? scale * 1.03 : scale})`,
        transformOrigin: 'bottom left',
        filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.38))',
      }}
    >
      {/* Smoke effect absolutely positioned above the cup */}
      <div
        className="absolute pointer-events-none select-none z-[30]"
        style={{
          left: '50%',
          top: smokeOffsetY,
          transform: 'translateX(-50%)',
          width: smokeSize,
          height: smokeSize * 1.2, // keep SVG aspect ratio
        }}
      >
        <svg
          width={smokeSize}
          height={smokeSize * 1.8}
          viewBox="0 0 80 144"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
          style={{
            filter: 'drop-shadow(0 1px 2px rgba(248,250,252,0.4))',
            willChange: 'transform, opacity',
          }}
        >
          <defs>
            <filter id="smokeBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
            </filter>
            <linearGradient id="smoke1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="50%" stopColor="rgba(248,250,252,0.7)" />
              <stop offset="100%" stopColor="rgba(203,213,225,0.2)" />
            </linearGradient>
            <linearGradient id="smoke2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(248,250,252,0.8)" />
              <stop offset="100%" stopColor="rgba(226,232,240,0.3)" />
            </linearGradient>
            <linearGradient id="smoke3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(241,245,249,0.6)" />
              <stop offset="100%" stopColor="rgba(203,213,225,0.1)" />
            </linearGradient>
          </defs>
          {/* Main plume */}
          <path
            d="M40 134 C36 118 46 102 39 92 C51 82 31 72 43 57 C36 47 49 32 41 16"
            stroke="url(#smoke1)"
            strokeWidth={7 * (smokeSize / 80)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              animation: 'smokeMotion 6.5s ease-in-out infinite',
              transformOrigin: 'center',
              filter: 'url(#smokeBlur)',
              willChange: 'transform, opacity',
              opacity: 0.9 * intensity,
            }}
          />
          {/* Wispy strand - delayed */}
          <path
            d="M46 139 C43 124 51 108 45 98 C56 88 36 78 48 63 C41 53 53 38 46 23"
            stroke="url(#smoke2)"
            strokeWidth={5 * (smokeSize / 80)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              animation: 'smokeMotion 7.2s 0.6s ease-in-out infinite',
              transformOrigin: 'center',
              filter: 'url(#smokeBlur)',
              willChange: 'transform, opacity',
              opacity: 0.7 * intensity,
            }}
          />
          {/* Curling tendril */}
          <path
            d="M36 129 C33 114 39 99 36 89 C43 79 29 69 39 54 C33 44 45 32 38 16"
            stroke="url(#smoke3)"
            strokeWidth={4 * (smokeSize / 80)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              animation: 'smokeMotion 8.4s 1s ease-in-out infinite',
              transformOrigin: 'center',
              filter: 'url(#smokeBlur)',
              willChange: 'transform, opacity',
              opacity: 0.5 * intensity,
            }}
          />
          {/* Background wisps */}
          <path
            d="M51 132 C49 116 56 101 52 91 C61 81 41 71 53 56 C47 46 59 35 51 21"
            stroke="rgba(203,213,225,0.3)"
            strokeWidth={3 * (smokeSize / 80)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              animation: 'smokeMotion 9.6s 1.6s ease-in-out infinite',
              transformOrigin: 'center',
              filter: 'url(#smokeBlur)',
              willChange: 'transform, opacity',
              opacity: 0.35 * intensity,
            }}
          />
          <style>{`
            @keyframes smokeMotion {
              0% {
                transform: translate3d(0, 0, 0) rotate(0deg) scaleY(1);
                opacity: 0;
              }
              10% {
                opacity: 0.55;
              }
              25% {
                transform: translate3d(-1px, -6px, 0) rotate(-0.4deg) scaleY(1.05);
                opacity: 0.85;
              }
              50% {
                transform: translate3d(1px, -14px, 0) rotate(0.6deg) scaleY(1.12);
                opacity: 0.75;
              }
              75% {
                transform: translate3d(-0.5px, -20px, 0) rotate(-0.3deg) scaleY(1.2);
                opacity: 0.45;
              }
              100% {
                transform: translate3d(0, -28px, 0) rotate(1.2deg) scaleY(1.28);
                opacity: 0;
              }
            }
          `}</style>
        </svg>
      </div>
      <img
        src="/assets/props/coffee.png"
        alt="Coffee cup"
        className="w-[180px] h-[128px] sm:w-[210px] sm:h-[150px] md:w-[240px] md:h-[170px] object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
