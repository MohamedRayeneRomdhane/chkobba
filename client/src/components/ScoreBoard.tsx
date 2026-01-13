import React from 'react';
import type { GameState } from '../types';

type Props = {
  state: GameState | null;
  teamNames?: [string, string];
  mySeat?: number | null;
  onRenameTeam?: (teamIndex: 0 | 1, name: string) => Promise<{ ok: boolean; msg?: string }>;
};

export default function ScoreBoard({ state, teamNames, mySeat, onRenameTeam }: Props) {
  const s = state?.scoresByTeam || [0, 0];
  const chk = state?.chkobbaByTeam || [0, 0];
  const [open, setOpen] = React.useState(false);

  const [editingTeam, setEditingTeam] = React.useState<0 | 1 | null>(null);
  const [draftName, setDraftName] = React.useState('');
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState(false);

  const canEditTeam = React.useCallback(
    (teamIndex: 0 | 1) => {
      if (mySeat == null) return false;
      const myTeam = mySeat % 2 === 0 ? 0 : 1;
      return myTeam === teamIndex;
    },
    [mySeat]
  );

  const resolvedNames: [string, string] = teamNames ?? ['Team A', 'Team B'];

  const startEditing = (teamIndex: 0 | 1) => {
    setRenameError(null);
    setEditingTeam(teamIndex);
    setDraftName((resolvedNames[teamIndex] || '').slice(0, 5));
  };

  const cancelEditing = () => {
    setRenaming(false);
    setRenameError(null);
    setEditingTeam(null);
    setDraftName('');
  };

  const submitRename = async () => {
    if (editingTeam == null) return;
    if (!onRenameTeam) return;

    const trimmed = draftName.trim();
    if ([...trimmed].length < 1) {
      setRenameError('Enter a name (max 5 chars).');
      return;
    }
    if ([...trimmed].length > 5) {
      setRenameError('Max 5 characters.');
      return;
    }

    try {
      setRenaming(true);
      setRenameError(null);
      const res = await onRenameTeam(editingTeam, trimmed);
      if (!res.ok) {
        setRenameError(res.msg || 'Rename failed');
        return;
      }
      cancelEditing();
    } finally {
      setRenaming(false);
    }
  };

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
              <div>
                {teamRow(resolvedNames[0], 'Seats 1 + 3', s[0], chk[0], 'amber')}
                {canEditTeam(0) && (
                  <div className="mt-1 flex items-center gap-2">
                    {editingTeam === 0 ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={draftName}
                          maxLength={5}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                          onChange={(e) => {
                            setDraftName(e.currentTarget.value.slice(0, 5));
                            if (renameError) setRenameError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void submitRename();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          placeholder="Name"
                          aria-label="Rename Team A"
                          disabled={renaming}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] disabled:opacity-50"
                          onClick={() => void submitRename()}
                          disabled={renaming}
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] disabled:opacity-50"
                          onClick={cancelEditing}
                          disabled={renaming}
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-[11px] text-white/75 hover:text-white underline decoration-white/30 hover:decoration-white/60"
                        onClick={() => startEditing(0)}
                      >
                        Rename your team
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="h-px bg-white/10" />
              <div>
                {teamRow(resolvedNames[1], 'Seats 2 + 4', s[1], chk[1], 'sky')}
                {canEditTeam(1) && (
                  <div className="mt-1 flex items-center gap-2">
                    {editingTeam === 1 ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={draftName}
                          maxLength={5}
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                          onChange={(e) => {
                            setDraftName(e.currentTarget.value.slice(0, 5));
                            if (renameError) setRenameError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void submitRename();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          placeholder="Name"
                          aria-label="Rename Team B"
                          disabled={renaming}
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] disabled:opacity-50"
                          onClick={() => void submitRename()}
                          disabled={renaming}
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] disabled:opacity-50"
                          onClick={cancelEditing}
                          disabled={renaming}
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-[11px] text-white/75 hover:text-white underline decoration-white/30 hover:decoration-white/60"
                        onClick={() => startEditing(1)}
                      >
                        Rename your team
                      </button>
                    )}
                  </div>
                )}
              </div>

              {renameError && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-100">
                  {renameError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
