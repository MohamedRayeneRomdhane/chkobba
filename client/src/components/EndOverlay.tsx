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
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="chalkboard-frame">
        <div className="chalkboard-surface">
          <h2 className="chalk-text text-3xl mb-2">Round Summary</h2>
          {banner && <p className="chalk-text text-base opacity-90 mb-3">{banner}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 chalk-text">
            {scores && (
              <div className="text-left p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">Team A</span>
                  <span className="text-2xl">{scores[0]}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">Team B</span>
                  <span className="text-2xl">{scores[1]}</span>
                </div>
                <div className="chalk-divider my-2" />
                <div className="text-xl">
                  Winner:{' '}
                  {scores[0] === scores[1] ? 'Tie' : scores[0] > scores[1] ? 'Team A' : 'Team B'}
                </div>
              </div>
            )}

            {details && (
              <div className="text-left p-2">
                <div className="text-xl mb-2">Breakdown</div>
                <ul className="space-y-1 text-base">
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

          <div className="flex items-center justify-center gap-6 mt-2">
            <button onClick={onReplay} className="replay-btn">
              <span>Replay</span>
            </button>
            <button onClick={onQuit} className="replay-btn replay-btn--danger">
              <span>Quit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
