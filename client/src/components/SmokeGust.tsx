/* eslint-disable prettier/prettier */
import React from 'react';
import { createPortal } from 'react-dom';

type SmokeGustProps = {
  // Duration of the gust animation in ms
  duration?: number;
  // Overall opacity (0..1)
  opacity?: number;
  // Blur intensity in px
  blur?: number;
  // Color tint of the smoke
  color?: string;
  // Direction in degrees (0: to the right, 90: up)
  directionDeg?: number;
  // Spread scale (size multiplier)
  spread?: number;
  // Delay before fade-out in ms
  hold?: number;
  // Origin point as viewport percentage (0..100)
  originXPercent?: number;
  originYPercent?: number;
  // Optional selector to render into a container (portals)
  targetSelector?: string;
  // Opacity fade-in duration in ms
  fadeInMs?: number;
  // Scale growth range (multiplier applied across phases)
  growthFrom?: number; // start scale factor
  growthTo?: number;   // end scale factor
  // Add subtle smoke texture using SVG turbulence
  texture?: boolean;
  // Called when animation completes
  onComplete?: () => void;
};

// Full-screen, pointer-events-none overlay that animates a mist/gust across the table.
export default function SmokeGust({
  duration = 1800,
  opacity = 0.65,
  blur = 12,
  color = 'rgba(235, 240, 245, 1)',
  directionDeg = 90,
  spread = 1.2,
  hold = 300,
  originXPercent = 50,
  originYPercent = 95,
  targetSelector,
  fadeInMs = 500,
  growthFrom = 0.92,
  growthTo = 2,
  texture = true,
  onComplete,
}: SmokeGustProps) {
  const [phase, setPhase] = React.useState<'enter' | 'hold' | 'exit'>('enter');

  React.useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('hold'), duration);
    const holdTimer = setTimeout(() => setPhase('exit'), duration + hold);
    const exitTimer = setTimeout(
      () => onComplete && onComplete(),
      duration + hold + duration * 0.6
    );
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [duration, hold, onComplete]);

  const angleRad = (directionDeg * Math.PI) / 180;
  const translateX = Math.cos(angleRad) * 0; // minimal lateral drift
  const translateY = -Math.sin(angleRad) * 40; // rise distance

  const baseOpacity = opacity;
  const phaseOpacity = phase === 'enter' ? baseOpacity : phase === 'hold' ? baseOpacity : 0;
  const opacityTransitionMs = phase === 'enter' ? fadeInMs : Math.round(duration * 0.6);
  const phaseScaleBase = phase === 'enter' ? 1.0 : phase === 'hold' ? 1.05 : 1.12;
  const growthScale = phase === 'enter' ? growthFrom : phase === 'hold' ? (growthFrom + (growthTo - growthFrom) * 0.6) : growthTo;
  const phaseScale = phaseScaleBase * growthScale;

  const content = (
    <div
      className="absolute inset-0 z-[60] pointer-events-none"
      style={{
        // Subtle tinting through backdrop
        mixBlendMode: 'screen',
      }}
    >
      {/* Blob-shaped mist rising from the player's side */}
      <div
        className="absolute"
        style={{
          left: `${originXPercent}%`,
          top: `${originYPercent}%`,
          transform: `translate(-50%, -50%) scale(${spread * phaseScale}) translate(${translateX}vw, ${translateY}vh)`,
          transition: `transform ${duration}ms ease-out, opacity ${opacityTransitionMs}ms ease-in`,
          opacity: phaseOpacity,
          filter: `blur(${blur}px) drop-shadow(0 2px 6px rgba(0,0,0,0.12))`,
        }}
      >
        {/* Primary blob with optional SVG texture */}
        {texture ? (
          <svg
            width={64 * spread}
            height={40 * spread}
            viewBox="0 0 64 40"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <defs>
              <filter id="smokeNoise" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" />
                <feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <radialGradient id="blobGrad" cx="45%" cy="60%" r="65%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="30%" stopColor={color} stopOpacity="0.55" />
                <stop offset="52%" stopColor={color} stopOpacity="0.28" />
                <stop offset="72%" stopColor={color} stopOpacity="0.12" />
                <stop offset="92%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            </defs>
            <g filter="url(#smokeNoise)" style={{ filter: `url(#smokeNoise)` }}>
              <ellipse cx="26" cy="22" rx="24" ry="16" fill="url(#blobGrad)" />
              <ellipse cx="14" cy="16" rx="14" ry="9" fill={color} opacity="0.08" />
              <ellipse cx="38" cy="14" rx="12" ry="8" fill={color} opacity="0.06" />
            </g>
          </svg>
        ) : (
          <div
            style={{
              width: `${64 * spread}vmin`,
              height: `${40 * spread}vmin`,
              background: `radial-gradient( circle at 45% 60%, ${color} 12%, rgba(235,240,245,0.55) 30%, rgba(235,240,245,0.28) 52%, rgba(235,240,245,0.12) 72%, rgba(235,240,245,0.0) 92% )`,
              borderRadius: '50% / 44%',
            }}
          />
        )}
        {/* Secondary wisps for texture */}
        <div
          style={{
            position: 'absolute',
            left: '-14vmin',
            top: '-8vmin',
            width: `${36 * spread}vmin`,
            height: `${22 * spread}vmin`,
            background: `radial-gradient( circle at 60% 50%, ${color} 10%, rgba(235,240,245,0.38) 40%, rgba(235,240,245,0.0) 88% )`,
            borderRadius: '50% / 42%',
            filter: `blur(${blur * 0.6}px)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '20vmin',
            top: '-10vmin',
            width: `${28 * spread}vmin`,
            height: `${18 * spread}vmin`,
            background: `radial-gradient( circle at 40% 50%, ${color} 8%, rgba(235,240,245,0.32) 38%, rgba(235,240,245,0.0) 88% )`,
            borderRadius: '50% / 45%',
            filter: `blur(${blur * 0.5}px)`,
          }}
        />
      </div>
    </div>
  );

  if (targetSelector) {
    const target = typeof document !== 'undefined' ? document.querySelector(targetSelector) : null;
    if (target) return createPortal(content, target);
  }
  // Fallback to full-screen overlay if no target
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">{content}</div>
  );
}
