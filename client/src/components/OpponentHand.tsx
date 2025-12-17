import React from 'react';
import { CARD_BACK_IMAGE } from '../game/cardAssets';

type Props = {
  position: 'top' | 'left' | 'right';
  count?: number;
  dealTick?: number;
  onDealAnimStart?: () => void;
};

export default function OpponentHand({ position, count = 3, dealTick, onDealAnimStart }: Props) {
  const boxes = Math.max(0, Math.min(12, count));
  const nodes = Array.from({ length: boxes });

  const base = 'absolute flex gap-2 sm:gap-3';
  const posClass =
    position === 'top'
      ? 'top-0 left-1/2 -translate-x-1/2 p-2 sm:p-3'
      : position === 'left'
        ? 'left-0 top-1/2 -translate-y-1/2 flex-col p-2 sm:p-3'
        : 'right-0 top-1/2 -translate-y-1/2 flex-col p-2 sm:p-3';

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
      {nodes.map((_, i) => (
        <div
          key={`${position}-${i}-${dealTick}`}
          className={dealTick ? animClass : ''}
          style={{
            animationDelay: dealTick ? `${Math.round(phaseMs + i * delaySpacingMs)}ms` : undefined,
            animationDuration: dealTick ? `${cardAnimMs}ms` : undefined,
          }}
          onAnimationStart={() => {
            if (dealTick) onDealAnimStart?.();
          }}
        >
          <div
            className="w-[clamp(46px,8vw,72px)] aspect-[2/3] rounded-lg border-2 border-gray-800 shadow-md overflow-hidden"
            data-op-card
          >
            <img
              src={CARD_BACK_IMAGE}
              alt="Card back"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
