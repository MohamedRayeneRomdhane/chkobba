import React from 'react';
import type { GameState } from '../types';

export default function ScoreBoard({ state }: { state: GameState | null }) {
  const s = state?.scoresByTeam || [0, 0];
  const chk = state?.chkobbaByTeam || [0, 0];
  return (
    <div className="absolute top-2 left-2 text-[#222] bg-white/85 px-2.5 py-2 rounded-md text-xs sm:text-sm shadow">
      <div>Team A (0+2): {s[0]} pts • chk {chk[0]}</div>
      <div>Team B (1+3): {s[1]} pts • chk {chk[1]}</div>
    </div>
  );
}
