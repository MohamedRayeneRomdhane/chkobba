import React, { Suspense, useCallback, useRef, useState } from 'react';
import useSound from '../hooks/useSound';
import SmokeGust from './SmokeGust';
const SmokeGustR3F = React.lazy(() => import('./SmokeGustR3F'));

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

  // Stable callback to avoid restarting smoke animation on parent re-renders (e.g., hover)
  const handleGustComplete = useCallback(() => {
    setShowGust(false);
  }, []);

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
        <Suspense fallback={null}>
          {typeof window !== 'undefined' && 'WebGLRenderingContext' in window ? (
            <SmokeGustR3F
              duration={950}
              hold={800}
              fadeInMs={500}
              opacity={0.78}
              color="#a1aab3"
              originXPercent={52}
              originYPercent={63}
              spread={2.2}
              growthFrom={0.8}
              growthTo={1}
              riseVh={100}
              layers={8}
              alphaBoost={2}
              noiseScale={2.5}
              noiseSpeed={0.14}
              widthFactor={1}
              heightFactor={1.6}
              targetSelector="#table-mat-overlay"
              onComplete={handleGustComplete}
            />
          ) : (
            <SmokeGust
              duration={1600}
              opacity={0.62}
              blur={12}
              directionDeg={90}
              spread={1.08}
              hold={260}
              originXPercent={50}
              originYPercent={98}
              targetSelector="#table-mat-overlay"
              onComplete={handleGustComplete}
            />
          )}
        </Suspense>
      )}
    </div>
  );
}
