import React from 'react';
import type { Card } from '../types';
import { getCardImage } from '../game/cardAssets';

interface PlayerHandProps {
  cards: Card[];
  onPlay: (_cardId: string) => void;
  selectedId?: string | null;
  onSelect?: (_cardId: string) => void;
  dealTick?: number;
}

export default function PlayerHand({
  cards,
  onPlay,
  selectedId,
  onSelect,
  dealTick,
}: PlayerHandProps) {
  const isDisabled = cards.length === 0;
  return (
    <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 flex-wrap max-w-full">
      {cards.map((c, i) => (
        <div
          key={c.id}
          onClick={() => {
            if (isDisabled) return;
            if (onSelect) onSelect(c.id);
            else onPlay(c.id);
          }}
          className={`w-[68px] h-[98px] sm:w-[82px] sm:h-[118px] md:w-[96px] md:h-[136px] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.03]'} ${selectedId === c.id ? 'ring-2 ring-amber-400 border-gray-800' : 'border-gray-800'} ${dealTick ? 'animate-[deal_400ms_ease-out]' : ''}`}
          style={{ transform: `rotate(${(i - 1) * 4}deg)` }}
          title={`${c.rank} of ${c.suit}`}
        >
          <img
            src={getCardImage(c)}
            alt={`${c.rank} of ${c.suit}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
