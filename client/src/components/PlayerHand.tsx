import React from "react";
import type { Card } from "../types";

interface PlayerHandProps {
  cards: Card[];
  onPlay: (cardId: string) => void;
}

export default function PlayerHand({ cards, onPlay }: PlayerHandProps) {
  const isDisabled = cards.length === 0;
  return (
    <div className="flex justify-center gap-4 p-4">
      {cards.map((c, i) => (
        <div
          key={c.id}
          onClick={() => !isDisabled && onPlay(c.id)}
          className={`w-20 h-30 rounded-lg bg-white border-2 border-gray-800 flex flex-col items-center justify-center shadow-md ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
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
