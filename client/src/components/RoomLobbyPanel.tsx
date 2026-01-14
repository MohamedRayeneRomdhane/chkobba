import React from 'react';
import type { RoomSettings, RoomSnapshot } from '../types';

type Props = {
  roomCode: string;
  snapshot: RoomSnapshot;
  socketId: string | null;
  gameStarted: boolean;
  onUpdateSettings: (settings: Partial<RoomSettings>) => Promise<{ ok: boolean; msg?: string }>;
  onLaunchGame: () => Promise<{ ok: boolean; msg?: string }>;
};

const DEFAULT_SETTINGS: RoomSettings = {
  mode: 'teams',
  playerCount: 4,
  turnDurationMs: 60_000,
  turnTimerEnabled: true,
  fillWithBots: false,
};

export default function RoomLobbyPanel({
  roomCode,
  snapshot,
  socketId,
  gameStarted,
  onUpdateSettings,
  onLaunchGame,
}: Props) {
  const settings = snapshot.settings ?? DEFAULT_SETTINGS;
  const isHost = !!socketId && snapshot.hostId === socketId;
  const fillWithBots = !!settings.fillWithBots;
  const turnTimerEnabled = settings.turnTimerEnabled !== false;

  const requiredPlayers = settings.playerCount;
  const seated = (snapshot.seats ?? [null, null, null, null])
    .slice(0, requiredPlayers)
    .filter((s) => !!s).length;

  const [turnSec, setTurnSec] = React.useState<number>(Math.round(settings.turnDurationMs / 1000));
  const [mode, setMode] = React.useState<'1v1' | 'teams'>(settings.mode);
  const [timerOn, setTimerOn] = React.useState<boolean>(turnTimerEnabled);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTurnSec(Math.round((snapshot.settings ?? DEFAULT_SETTINGS).turnDurationMs / 1000));
    setMode((snapshot.settings ?? DEFAULT_SETTINGS).mode);
    setTimerOn((snapshot.settings ?? DEFAULT_SETTINGS).turnTimerEnabled !== false);
  }, [snapshot.settings]);

  if (!roomCode || !snapshot || gameStarted) return null;

  const readyToStart = fillWithBots ? seated >= 1 : seated >= requiredPlayers;

  const modeOptions: Array<{ key: '1v1' | 'teams'; label: string; playerCount: 2 | 4 }> = [
    { key: '1v1', label: '1v1 (2 players)', playerCount: 2 },
    { key: 'teams', label: 'Teams (4 players)', playerCount: 4 },
  ];

  return (
    <div
      data-testid="lobby-panel"
      className="absolute left-1/2 -translate-x-1/2 top-[clamp(44px,7vh,82px)] z-[80] w-[min(96%,860px)]"
    >
      <div className="rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md shadow-caféGlow px-3 py-2 sm:px-4 sm:py-3 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="text-[11px] sm:text-xs text-white/75">Room</div>
            <div className="mt-0.5 flex flex-col items-center gap-0.5">
              <div className="font-semibold tracking-wide text-[13px] sm:text-sm truncate max-w-[min(92vw,520px)]">
                {roomCode}
              </div>
              <div className="text-[11px] sm:text-xs text-white/75 whitespace-nowrap">
                Players {seated}/{requiredPlayers}
              </div>
            </div>
          </div>

          {isHost ? (
            <div className="w-full max-w-[520px] flex flex-col gap-2">
              {/* Mode / players */}
              <div className="grid grid-cols-1 gap-1 rounded-xl border border-white/15 bg-white/5 p-1">
                {modeOptions.map((opt) => {
                  const active = mode === opt.key;
                  const disabled = opt.playerCount < seated;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={disabled || busy}
                      className={
                        `w-full px-3 py-2 rounded-lg text-[12px] sm:text-sm transition text-left ` +
                        (active
                          ? 'bg-amber-400/90 text-black'
                          : 'bg-transparent text-white/85 hover:bg-white/10') +
                        (disabled ? ' opacity-40 cursor-not-allowed' : '')
                      }
                      onClick={async () => {
                        if (disabled) return;
                        setMsg(null);
                        setBusy(true);
                        setMode(opt.key);
                        const res = await onUpdateSettings({ playerCount: opt.playerCount });
                        setBusy(false);
                        if (!res.ok) setMsg(res.msg || 'Could not update settings');
                      }}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Fill with bots */}
              <label className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 cursor-pointer select-none">
                <div className="min-w-0">
                  <div className="text-[12px] sm:text-sm text-white/85">
                    Fill empty seats with bots
                  </div>
                  <div className="text-[11px] sm:text-xs text-white/60">
                    Lets you start with fewer players; bots join remaining seats.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fillWithBots}
                  disabled={busy}
                  onChange={async (e) => {
                    const next = e.currentTarget.checked;
                    setMsg(null);
                    setBusy(true);
                    const res = await onUpdateSettings({ fillWithBots: next });
                    setBusy(false);
                    if (!res.ok) setMsg(res.msg || 'Could not update settings');
                  }}
                  className="h-5 w-5 accent-emerald-400"
                />
              </label>

              {/* Turn timer toggle */}
              <label className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 cursor-pointer select-none">
                <div className="min-w-0">
                  <div className="text-[12px] sm:text-sm text-white/85">Turn timer</div>
                  <div className="text-[11px] sm:text-xs text-white/60">
                    When off, turns have no time limit.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={timerOn}
                  disabled={busy}
                  onChange={async (e) => {
                    const next = e.currentTarget.checked;
                    setMsg(null);
                    setBusy(true);
                    setTimerOn(next);
                    const res = await onUpdateSettings({ turnTimerEnabled: next });
                    setBusy(false);
                    if (!res.ok) setMsg(res.msg || 'Could not update settings');
                  }}
                  className="h-5 w-5 accent-amber-300"
                />
              </label>

              {/* Turn time */}
              {timerOn && (
                <div className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                  <div className="text-[12px] sm:text-sm text-white/75 whitespace-nowrap">
                    Turn time (sec)
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    step={5}
                    value={turnSec}
                    disabled={busy}
                    onChange={(e) => setTurnSec(Number(e.currentTarget.value))}
                    onBlur={async () => {
                      setMsg(null);
                      const sec = Math.max(10, Math.min(180, Math.round(Number(turnSec) || 60)));
                      setTurnSec(sec);
                      setBusy(true);
                      const res = await onUpdateSettings({ turnDurationMs: sec * 1000 });
                      setBusy(false);
                      if (!res.ok) setMsg(res.msg || 'Could not update settings');
                    }}
                    className="w-[96px] rounded-lg bg-black/30 border border-white/15 px-2 py-1 text-[13px] sm:text-sm text-white text-right outline-none focus:ring-2 focus:ring-amber-300/60"
                  />
                </div>
              )}

              {/* Start */}
              <button
                data-testid="start-game"
                type="button"
                disabled={!readyToStart || busy}
                className={
                  `w-full rounded-xl px-4 py-2.5 text-[13px] sm:text-sm font-semibold shadow-md transition ` +
                  (readyToStart
                    ? 'bg-emerald-400 text-black hover:bg-emerald-300'
                    : 'bg-white/10 text-white/50 cursor-not-allowed')
                }
                onClick={async () => {
                  setMsg(null);
                  setBusy(true);
                  const res = await onLaunchGame();
                  setBusy(false);
                  if (!res.ok) setMsg(res.msg || 'Could not start game');
                }}
              >
                Start game
              </button>

              {!readyToStart && (
                <div className="text-[11px] sm:text-xs text-white/60 text-center">
                  {fillWithBots
                    ? 'Join the room first to start.'
                    : `Waiting for ${requiredPlayers - seated} more player(s) to join.`}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px] sm:text-sm text-white/80 text-center">
              Waiting for host to start…
            </div>
          )}
        </div>

        {msg && (
          <div className="mt-2 text-[11px] sm:text-xs text-red-100/90 bg-red-500/10 border border-red-400/25 rounded-xl px-3 py-2">
            {msg}
          </div>
        )}

        {!isHost && (
          <div className="mt-2 text-[11px] sm:text-xs text-white/70 text-center">
            <span>
              Timer: {turnTimerEnabled ? `${Math.round(settings.turnDurationMs / 1000)}s` : 'Off'}
            </span>
            <span>{' • '}</span>
            <span>Mode: {settings.playerCount === 2 ? '1v1' : 'Teams'}</span>
            <span>{' • '}</span>
            <span>Bots: {fillWithBots ? 'On' : 'Off'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
