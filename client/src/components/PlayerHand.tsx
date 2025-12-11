import React from "react";
import type { Card } from "../types";

interface PlayerHandProps {
  cards: Card[];
  onPlay: (cardId: string) => void;
}

export default function PlayerHand({ cards, onPlay }: PlayerHandProps) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: 16 }}>
      {cards.map((c, i) => (
        <div
          key={c.id}
          onClick={() => onPlay(c.id)}
          style={{
            width: 80,
            height: 120,
            borderRadius: 8,
            background: "#fff",
            border: "2px solid #333",
            transform: `rotate(${(i - 1) * 5}deg)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 8px rgba(0,0,0,0.25)",
          }}
          title={`${c.rank} of ${c.suit}`}
        >
          <div style={{ fontWeight: 700 }}>{c.rank}</div>
          <div style={{ fontSize: 12 }}>{c.suit}</div>
        </div>
      ))}
    </div>
  );
}
