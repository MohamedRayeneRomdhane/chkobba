import React from 'react';
import type { GameState } from '../types';

export default function ScoreBoard({ state }: { state: GameState | null }) {
  const s = state?.scoresByTeam || [0, 0];
  const chk = state?.chkobbaByTeam || [0, 0];
  const [open, setOpen] = React.useState(false);

  const teamRow = (
    name: string,
    seatLabel: string,
    score: number,
    chkobba: number,
    tone: 'amber' | 'sky'
  ) => (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${
            tone === 'amber' ? 'bg-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,0.20)]' : ''
          } ${tone === 'sky' ? 'bg-sky-300 shadow-[0_0_0_3px_rgba(125,211,252,0.20)]' : ''}`}
          aria-hidden
        />
        <div className="min-w-0">
          <div className="text-[11px] sm:text-[12px] font-semibold tracking-wide truncate">
            {name}
          </div>
          <div className="text-[10px] sm:text-[11px] text-white/75 truncate">{seatLabel}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[16px] sm:text-[18px] leading-none font-extrabold tabular-nums">
          {score}
        </div>
        <div className="text-[10px] sm:text-[11px] text-white/75 tabular-nums">chk {chkobba}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="absolute top-2 left-2 z-[65]">
        {/* Always: subtle pill button */}
        <button
          type="button"
          className="scoreboard-pill inline-flex items-center gap-2 rounded-full border border-white/10 bg-tableWood-dark/55 backdrop-blur-sm shadow-caféGlow px-2 py-1 text-white/90 hover:text-white hover:bg-tableWood-dark/65 touch-manipulation"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="scoreboard-panel"
          title="Scores"
        >
          <span className="scoreboard-pill__label text-[9px] sm:text-[11px] font-semibold tracking-wide">
            Score
          </span>
          <span className="scoreboard-pill__scores inline-flex items-center gap-1 text-[10px] sm:text-[12px] tabular-nums">
            <span className="scoreboard-pill__chip inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 sm:px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden />
              <span className="leading-none">{s[0]}</span>
            </span>
            <span className="scoreboard-pill__sep text-white/45" aria-hidden>
              •
            </span>
            <span className="scoreboard-pill__chip inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 sm:px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-sky-300" aria-hidden />
              <span className="leading-none">{s[1]}</span>
            </span>
          </span>
          <span
            className="scoreboard-pill__chev text-white/55 text-[9px] sm:text-[11px]"
            aria-hidden
          >
            {open ? '▴' : '▾'}
          </span>
        </button>

        {/* Expand panel (compact, non-intrusive) */}
        {open && (
          <div
            id="scoreboard-panel"
            className="mt-2 w-[min(84vw,220px)] sm:w-[220px] rounded-2xl border border-white/12 bg-tableWood-dark/85 backdrop-blur-sm shadow-caféGlow text-white p-2.5"
            role="dialog"
            aria-label="Scores"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold tracking-wide text-white/90">Scores</div>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px]"
                onClick={() => setOpen(false)}
                aria-label="Close scores"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {teamRow('Team A', 'Seats 1 + 3', s[0], chk[0], 'amber')}
              <div className="h-px bg-white/10" />
              {teamRow('Team B', 'Seats 2 + 4', s[1], chk[1], 'sky')}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
