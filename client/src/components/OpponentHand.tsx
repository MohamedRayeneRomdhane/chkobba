import React from 'react';
import { CARD_BACK_IMAGE } from '../game/cardAssets';

type Props = { position: 'top' | 'left' | 'right'; count?: number };

export default function OpponentHand({ position, count = 3 }: Props) {
  const boxes = Math.max(0, Math.min(12, count));
  const nodes = Array.from({ length: boxes });

  const base = 'absolute flex gap-2 sm:gap-3';
  const posClass =
    position === 'top'
      ? 'top-0 left-1/2 -translate-x-1/2 p-2 sm:p-3'
      : position === 'left'
        ? 'left-0 top-1/2 -translate-y-1/2 flex-col p-2 sm:p-3'
        : 'right-0 top-1/2 -translate-y-1/2 flex-col p-2 sm:p-3';

  return (
    <div className={`${base} ${posClass}`}>
      {nodes.map((_, i) => (
        <div
          key={i}
          className="w-[clamp(46px,8vw,72px)] aspect-[2/3] rounded-lg border-2 border-gray-800 shadow-md overflow-hidden"
        >
          <img
            src={CARD_BACK_IMAGE}
            alt="Card back"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
