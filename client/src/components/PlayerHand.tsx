import React from "react";
import type { Card } from "../types";

interface PlayerHandProps {
  cards: Card[];
  onPlay: (cardId: string) => void;
  selectedId?: string | null;
  onSelect?: (cardId: string) => void;
  dealTick?: number;
}

export default function PlayerHand({ cards, onPlay, selectedId, onSelect, dealTick }: PlayerHandProps) {
  const isDisabled = cards.length === 0;
  return (
    <div className="flex justify-center gap-4 p-4">
      {cards.map((c, i) => (
        <div
          key={c.id}
          onClick={() => {
            if (isDisabled) return;
            if (onSelect) onSelect(c.id);
            else onPlay(c.id);
          }}
          className={`w-20 h-30 rounded-lg bg-white border-2 flex flex-col items-center justify-center shadow-md transition-transform duration-200 ease-out ${isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-1 hover:scale-[1.03]"} ${selectedId === c.id ? "ring-2 ring-amber-400 border-gray-800" : "border-gray-800"} ${dealTick ? "animate-[deal_400ms_ease-out]" : ""}`}
          style={{ transform: `rotate(${(i - 1) * 5}deg)` }}
          title={`${c.rank} of ${c.suit}`}
        >
          <div className="font-bold">{c.rank}</div>
          <div className="text-xs">{c.suit}</div>
        </div>
      ))}
    </div>
  );
}
