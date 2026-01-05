import React from 'react';

type RoundDetails = {
  mostCards?: 0 | 1;
  mostDiamonds?: 0 | 1;
  sevenDiamonds?: 0 | 1;
  chkobba?: [number, number];
  mostSevens?: 0 | 1 | 'tie';
};

interface EndOverlayProps {
  banner: string | null;
  scores: [number, number] | null;
  details: RoundDetails | null;
  replayWaiting?: { count: number; total: number } | null;
  onReplay: () => void;
  onQuit: () => void;
}

export default function EndOverlay({ banner, scores, details, onReplay, onQuit }: EndOverlayProps) {
  return (
    <div className="end-overlay fixed inset-0 bg-black/40 z-[200] p-2 sm:p-0 flex items-center justify-center">
      <div className="end-overlay-frame chalkboard-frame w-[min(92vw,520px)] sm:w-auto max-h-[82svh] sm:max-h-[92svh]">
        <div className="end-overlay-surface chalkboard-surface max-h-[78svh] sm:max-h-[88svh] overflow-y-auto">
          <h2 className="end-overlay-title chalk-text text-2xl sm:text-3xl mb-2">Round Summary</h2>
          {banner && (
            <p className="end-overlay-banner chalk-text text-sm sm:text-base opacity-90 mb-3">
              {banner}
            </p>
          )}

          <div className="end-overlay-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 chalk-text">
            {scores && (
              <div className="end-overlay-panel end-overlay-scores text-left p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base sm:text-lg">Team A</span>
                  <span className="end-overlay-score text-xl sm:text-2xl">{scores[0]}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base sm:text-lg">Team B</span>
                  <span className="end-overlay-score text-xl sm:text-2xl">{scores[1]}</span>
                </div>
                <div className="chalk-divider my-2" />
                <div className="end-overlay-winner text-lg sm:text-xl">
                  Winner:{' '}
                  {scores[0] === scores[1] ? 'Tie' : scores[0] > scores[1] ? 'Team A' : 'Team B'}
                </div>
              </div>
            )}

            {details && (
              <div className="end-overlay-panel text-left p-2">
                <div className="end-overlay-section-title text-lg sm:text-xl mb-2">Breakdown</div>
                <ul className="end-overlay-list space-y-1 text-sm sm:text-base">
                  <li>
                    Karta (most cards):{' '}
                    {details?.mostCards === 0
                      ? 'Team A'
                      : details?.mostCards === 1
                        ? 'Team B'
                        : '—'}
                  </li>
                  <li>
                    Dineri (most diamonds):{' '}
                    {details?.mostDiamonds === 0
                      ? 'Team A'
                      : details?.mostDiamonds === 1
                        ? 'Team B'
                        : '—'}
                  </li>
                  <li>
                    Elhaya (7♦):{' '}
                    {details?.sevenDiamonds === 0
                      ? 'Team A'
                      : details?.sevenDiamonds === 1
                        ? 'Team B'
                        : '—'}
                  </li>
                  <li>
                    Chkobbas: Team A {details?.chkobba?.[0] ?? 0} • Team B{' '}
                    {details?.chkobba?.[1] ?? 0}
                  </li>
                  <li>
                    Bermila (tie-break by 6s):{' '}
                    {details?.mostSevens === 0
                      ? 'Team A'
                      : details?.mostSevens === 1
                        ? 'Team B'
                        : details?.mostSevens === 'tie'
                          ? 'Tie'
                          : '—'}
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="end-overlay-actions flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6 mt-4">
            <button
              onClick={onReplay}
              className="replay-btn w-full sm:w-auto max-w-[320px] mx-auto"
            >
              <span>Replay</span>
            </button>
            <button
              onClick={onQuit}
              className="replay-btn replay-btn--danger w-full sm:w-auto max-w-[320px] mx-auto"
            >
              <span>Quit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
