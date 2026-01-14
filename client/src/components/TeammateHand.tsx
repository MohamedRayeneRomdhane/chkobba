import React from 'react';
import type { Card } from '../types';
import { getCardImage } from '../game/cardAssets';

function suitSymbol(suit: Card['suit']): string {
  if (suit === 'spades') return '♠';
  if (suit === 'hearts') return '♥';
  if (suit === 'diamonds') return '♦';
  return '♣';
}

type Props = {
  cards: Card[];
  dealTick?: number;
  onDealAnimStart?: () => void;
};

export default function TeammateHand({ cards, dealTick, onDealAnimStart }: Props) {
  const totalDurationMs = 1500;
  const cardAnimMs = 700;
  const n = cards.length;
  const delaySpacingMs = n > 1 ? Math.max(0, (totalDurationMs - cardAnimMs) / (n - 1)) : 0;
  const phaseMs = 30;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[clamp(10px,2.6vh,26px)] p-1.5 sm:p-2 flex gap-2 sm:gap-2.5"
      data-seat-anchor="top"
    >
      {cards.map((c, i) => (
        <div
          key={`${c.id}-${dealTick}`}
          className={`${dealTick ? 'deal-in-top' : ''} relative group`}
          style={{
            animationDelay: dealTick ? `${Math.round(phaseMs + i * delaySpacingMs)}ms` : undefined,
            animationDuration: dealTick ? `${cardAnimMs}ms` : undefined,
          }}
          onAnimationStart={() => {
            if (dealTick) onDealAnimStart?.();
          }}
          title={`${c.rank}${suitSymbol(c.suit)}`}
        >
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-1 translate-y-full z-[90] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="px-2 py-1 rounded-lg bg-black/70 border border-white/15 text-white text-[11px] sm:text-xs whitespace-nowrap shadow-md backdrop-blur">
              {c.rank}
              {suitSymbol(c.suit)}
            </div>
          </div>
          <div
            className="w-[clamp(56px,8.2vmin,124px)] aspect-[2/3] rounded-lg border-2 border-gray-800 shadow-md overflow-hidden"
            data-teammate-card
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
