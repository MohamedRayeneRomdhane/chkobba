import React from 'react';
import type { GameState } from '../types';

export default function ScoreBoard({ state }: { state: GameState | null }) {
  const s = state?.scoresByTeam || [0, 0];
  const chk = state?.chkobbaByTeam || [0, 0];
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const content = (
    <>
      <div>
        Team A (0+2): {s[0]} pts • chk {chk[0]}
      </div>
      <div>
        Team B (1+3): {s[1]} pts • chk {chk[1]}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: collapsed by default, expandable */}
      <div className="scoreboard-mobile absolute top-1 left-1 sm:hidden z-[65]">
        {!mobileOpen ? (
          <button
            type="button"
            className="px-2 py-1.5 rounded-md bg-white/85 text-[#222] shadow text-[11px] border border-black/10 touch-manipulation"
            onClick={() => setMobileOpen(true)}
            aria-expanded={false}
            aria-controls="mobile-scoreboard"
          >
            Scores
          </button>
        ) : (
          <div
            id="mobile-scoreboard"
            className="bg-white/90 text-[#222] px-2 py-1.5 rounded-md shadow border border-black/10"
            role="dialog"
            aria-label="Scores"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] leading-snug">{content}</div>
              <button
                type="button"
                className="shrink-0 px-2 py-1 rounded-md bg-black/5 hover:bg-black/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close scores"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: always visible (unchanged behavior) */}
      <div className="scoreboard-desktop hidden sm:block absolute top-2 left-2 text-[#222] bg-white/85 px-2.5 py-2 rounded-md text-xs sm:text-sm lg:text-base shadow">
        {content}
      </div>
    </>
  );
}
