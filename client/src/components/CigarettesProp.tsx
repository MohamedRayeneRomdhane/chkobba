import React, { useState } from 'react';
import useSound from '../hooks/useSound';

export default function CigarettesProp() {
  const [hover, setHover] = useState(false);
  const { play } = useSound('/assets/soundeffects/cigs.mp3', { interrupt: true, preload: 'auto' });
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={play}
      className={`absolute top-0 right-20 cursor-pointer transition-transform duration-150 ease-out ${hover ? 'scale-[1.03]' : ''}`}
      style={{
        transform: `${hover ? 'translateY(-1px)' : 'translateY(0)'} rotate(-0.5deg)`,
        filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.32))',
      }}
    >
      <img
        src="/assets/props/cigs.png"
        alt="Cigarette pack"
        className="w-[clamp(112px,18vmin,220px)] h-auto object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
