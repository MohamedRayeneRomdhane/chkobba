import React from 'react';
import type { Card } from '../types';
import { getCardImage } from '../game/cardAssets';

interface PlayerHandProps {
  cards: Card[];
  onPlay: (_cardId: string) => void;
  selectedId?: string | null;
  onSelect?: (_cardId: string) => void;
  dealTick?: number;
  onDealAnimStart?: () => void;
}

export default function PlayerHand({
  cards,
  onPlay,
  selectedId,
  onSelect,
  dealTick,
  onDealAnimStart,
}: PlayerHandProps) {
  const isDisabled = cards.length === 0;
  // Ensure the entire dealing sequence lasts ~3s
  const totalDurationMs = 1500;
  const cardAnimMs = 700; // per-card animation length
  const n = cards.length;
  const delaySpacingMs = n > 1 ? Math.max(0, (totalDurationMs - cardAnimMs) / (n - 1)) : 0;
  return (
    <div
      className="flex justify-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 flex-wrap max-w-full"
      data-seat-anchor="bottom"
    >
      {cards.map((c, i) => (
        <div
          key={`${c.id}-${dealTick}`}
          onClick={() => {
            if (isDisabled) return;
            if (onSelect) onSelect(c.id);
            else onPlay(c.id);
          }}
          className={`${dealTick ? 'deal-in-bottom' : ''}`}
          style={{
            animationDelay: dealTick ? `${Math.round(i * delaySpacingMs)}ms` : undefined,
            animationDuration: dealTick ? `${cardAnimMs}ms` : undefined,
          }}
          onAnimationStart={() => {
            if (dealTick) onDealAnimStart?.();
          }}
          title={`${c.rank} of ${c.suit}`}
        >
          <div
            className={`w-[clamp(56px,10vw,96px)] aspect-[2/3] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.03]'} ${selectedId === c.id ? 'ring-2 ring-amber-400 border-gray-800' : 'border-gray-800'}`}
            data-hand-card-id={c.id}
            style={{ transform: `rotate(${(i - 1) * 4}deg)` }}
          >
            <img
              src={getCardImage(c)}
              alt={`${c.rank} of ${c.suit}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
