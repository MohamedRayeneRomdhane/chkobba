import React from 'react';
import { CARD_BACK_IMAGE } from '../game/cardAssets';

type Props = {
  position: 'top' | 'left' | 'right';
  count?: number;
  dealTick?: number;
  onDealAnimStart?: () => void;
  showGhost?: boolean;
};

export default function OpponentHand({
  position,
  count = 3,
  dealTick,
  onDealAnimStart,
  showGhost = false,
}: Props) {
  // When a card is mid-flight keep an invisible ghost slot so the hand width
  // doesn't collapse before the flight animation finishes.
  const boxes = Math.max(0, Math.min(12, count));
  const nodes = Array.from({ length: showGhost ? boxes + 1 : boxes });

  const base = 'absolute flex gap-1.5 sm:gap-2';
  const posClass =
    position === 'top'
      ? 'top-0 left-1/2 -translate-x-1/2 p-1.5 sm:p-2'
      : position === 'left'
        ? 'left-0 top-1/2 -translate-y-1/2 flex-col p-1.5 sm:p-2'
        : 'right-0 top-1/2 -translate-y-1/2 flex-col p-1.5 sm:p-2';

  const animClass =
    position === 'top' ? 'deal-in-top' : position === 'left' ? 'deal-in-left' : 'deal-in-right';
  // Ensure the entire dealing sequence lasts ~3s
  const totalDurationMs = 1500;
  const cardAnimMs = 700; // per-card animation length
  const n = boxes;
  const delaySpacingMs = n > 1 ? Math.max(0, (totalDurationMs - cardAnimMs) / (n - 1)) : 0;
  const phaseMs = position === 'top' ? 30 : position === 'left' ? 60 : 90;

  return (
    <div className={`${base} ${posClass}`} data-seat-anchor={position}>
      {nodes.map((_, i) => {
        const isGhost = showGhost && i === nodes.length - 1;
        return (
          <div
            key={`${position}-${i}`}
            className={`${dealTick && !isGhost ? animClass : ''} ${isGhost ? 'opacity-0 pointer-events-none' : ''}`}
            style={{
              animationDelay:
                dealTick && !isGhost ? `${Math.round(phaseMs + i * delaySpacingMs)}ms` : undefined,
              animationDuration: dealTick && !isGhost ? `${cardAnimMs}ms` : undefined,
            }}
            onAnimationStart={() => {
              if (dealTick && !isGhost) onDealAnimStart?.();
            }}
          >
            <div
              className="w-[clamp(48px,7vmin,104px)] aspect-[2/3] rounded-lg border-2 border-gray-800 shadow-md overflow-hidden"
              data-op-card
            >
              {!isGhost && (
                <img
                  src={CARD_BACK_IMAGE}
                  alt="Card back"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
