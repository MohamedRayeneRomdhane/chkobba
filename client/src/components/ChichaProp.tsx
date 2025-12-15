import React, { useRef, useState } from 'react';
import useSound from '../hooks/useSound';
import SmokeGust from './SmokeGust';

export default function ChichaProp() {
  const [hover, setHover] = useState(false);
  const isHoldingRef = useRef(false);

  const { play: playInhale, stop: stopInhale } = useSound('/assets/soundeffects/chicha.mp3', {
    loop: true,
    interrupt: true,
    preload: 'auto',
  });
  const { play: playExhale } = useSound('/assets/soundeffects/exhale.mp3', {
    interrupt: true,
    preload: 'auto',
  });
  const [showGust, setShowGust] = useState(false);

  const handlePressStart = () => {
    if (isHoldingRef.current) return;
    isHoldingRef.current = true;
    playInhale();
  };

  const handlePressEnd = () => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    stopInhale();
    // Play the exhale once after releasing
    playExhale();
    // Trigger smoke gust overlay
    setShowGust(true);
  };
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onPointerLeave={handlePressEnd}
      className={`absolute bottom-0 right-8 cursor-pointer transition-transform duration-150 ease-out ${hover ? 'scale-[1.03]' : ''}`}
      style={{
        transform: `${hover ? 'translateY(-1px)' : 'translateY(2px)'} rotate(1.5deg)`,
        filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.38))',
      }}
    >
      <img
        src="/assets/props/chicha.png"
        alt="Hookah"
        className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[250px] object-contain select-none"
        draggable={false}
      />
      {showGust && (
        <SmokeGust
          duration={800}
          opacity={0.62}
          blur={12}
          directionDeg={90}
          spread={1.08}
          hold={260}
          originXPercent={30}
          originYPercent={125}
          targetSelector="#table-mat-overlay"
          onComplete={() => setShowGust(false)}
        />
      )}
    </div>
  );
}
