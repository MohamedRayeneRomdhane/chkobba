import React from "react";
import type { GameState } from "../types";

export default function ScoreBoard({ state }: { state: GameState | null }) {
  const s = state?.scoresByTeam || [0, 0];
  const chk = state?.chkobbaByTeam || [0, 0];
  return (
    <div style={{ position: "absolute", top: 8, left: 8, color: "#222", background: "rgba(255,255,255,0.85)", padding: 8, borderRadius: 6 }}>
      <div>Team A (0+2): {s[0]} pts • chk {chk[0]}</div>
      <div>Team B (1+3): {s[1]} pts • chk {chk[1]}</div>
    </div>
  );
}
