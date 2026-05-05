import React from 'react';
import { useGameStore } from '../../store';
import type { GameNetwork } from '../../net/useGameNetwork';
import { useConnection, useRoom } from '../../store/selectors';

type Props = {
  net: GameNetwork;
  playerCount: 2 | 4;
};

const normalizeRoomCode = (raw: string) => raw.trim().toUpperCase();

/**
 * Both desktop and mobile header room controls.
 * Owns the local roomCodeInput + joinWarning UI. Everything else lives in store.
 */
export default function HeaderControls({ net, playerCount }: Props) {
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const [joinWarning, setJoinWarning] = React.useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = React.useState(false);

  const { roomCode, mySeat, snapshot, phase } = useRoom();
  const { connected } = useConnection();

  const mobileMenuOpen = useGameStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useGameStore((s) => s.setMobileMenuOpen);
  const setProfileModalOpen = useGameStore((s) => s.setProfileModalOpen);

  const mobileInputRef = React.useRef<HTMLInputElement | null>(null);
  const desktopInputRef = React.useRef<HTMLInputElement | null>(null);

  const tryJoin = React.useCallback(
    async (raw: string, opts?: { closeMobileMenu?: boolean }) => {
      const code = normalizeRoomCode(raw);
      if (!code) return;
      setJoinWarning(null);
      const res = await net.join(code);
      if (res.ok) {
        if (opts?.closeMobileMenu) setMobileMenuOpen(false);
        return;
      }
      const msg = (res.msg ?? '').toLowerCase();
      if (msg.includes('room full')) setJoinWarning('This room is full.');
      else if (msg.includes('room not found')) setJoinWarning('No room found for that code.');
      else setJoinWarning(res.msg || 'Could not join that room.');
    },
    [net, setMobileMenuOpen]
  );

  const createAndJoin = React.useCallback(
    async (closeMobileMenu = false) => {
      setJoinWarning(null);
      const code = await net.createRoom();
      await tryJoin(code, { closeMobileMenu });
    },
    [net, tryJoin]
  );

  const handleCreateAndJoin = React.useCallback(
    (closeMobileMenu = false) => {
      if (phase === 'playing' || phase === 'roundEnd') {
        setConfirmCreate(true);
        return;
      }
      void createAndJoin(closeMobileMenu);
    },
    [phase, createAndJoin]
  );

  const flashCopy = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.classList.add('ring', 'ring-white/40');
    window.setTimeout(() => input.classList.remove('ring', 'ring-white/40'), 600);
  };

  const RoomBadge = ({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) =>
    roomCode ? (
      <span className="inline-flex items-center gap-1">
        <span className="px-2 py-0.5 rounded bg-white/20 text-white/90 border border-white/20 shadow-sm">
          Room {roomCode}
        </span>
        <button
          title="Copy room code"
          className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white shadow-sm"
          onClick={() => {
            navigator.clipboard?.writeText(roomCode).then(() => flashCopy(inputRef.current));
          }}
        >
          <span aria-hidden>📋</span>
        </button>
      </span>
    ) : null;

  return (
    <>
      {confirmCreate && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[min(92vw,360px)] rounded-2xl border border-white/15 bg-tableWood-dark/95 shadow-caféGlow p-5 flex flex-col gap-4 text-white">
            <div className="text-base font-semibold">Leave current game?</div>
            <div className="text-sm text-white/75">
              You are in an active game. Creating a new room will remove you from it.
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                onClick={() => setConfirmCreate(false)}
              >
                Stay
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm"
                onClick={() => {
                  setConfirmCreate(false);
                  void createAndJoin(false);
                }}
              >
                Leave & Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile burger menu */}
      <div className="header-controls-mobile sm:hidden w-full flex items-center justify-end">
        <div className="relative">
          <button
            type="button"
            className={`burger-btn px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15 shadow-sm ${
              mobileMenuOpen ? 'burger-btn--open' : ''
            }`}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

          {mobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[300]"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full mt-2 z-[310] w-[min(92vw,340px)] rounded-xl bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow border border-white/10 p-2">
                <div className="px-2 py-1 text-xs text-white/80">Menu</div>

                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => handleCreateAndJoin(true)}
                >
                  Create & Join
                </button>

                <button
                  type="button"
                  className="mt-1 w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                >
                  Edit Profile
                </button>

                <div className="mt-2 rounded-lg bg-black/15 border border-white/10 p-2">
                  <div className="room-input room-input--fluid">
                    <div className="group">
                      <input
                        ref={mobileInputRef}
                        id="roomCodeMobile"
                        type="text"
                        className="input"
                        required
                        value={roomCodeInput}
                        onChange={(e) => {
                          setRoomCodeInput(e.currentTarget.value);
                          if (joinWarning) setJoinWarning(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            void tryJoin(roomCodeInput, { closeMobileMenu: true });
                          }
                        }}
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <span className="highlight" />
                      <span className="bar" />
                      <label htmlFor="roomCodeMobile">Room code</label>
                    </div>
                  </div>

                  {joinWarning && (
                    <div className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                      {joinWarning}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn--azure w-full justify-center mt-2"
                    onClick={() => void tryJoin(roomCodeInput, { closeMobileMenu: true })}
                  >
                    Join
                  </button>
                </div>

                {roomCode && (
                  <div className="mt-2 flex items-center justify-between gap-2 px-1 text-white/90">
                    <RoomBadge inputRef={mobileInputRef} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="header-controls-desktop hidden sm:flex items-center gap-4">
        <button className="btn btn--mint" onClick={() => handleCreateAndJoin(false)}>
          Create & Join
        </button>

        <div className="room-input">
          <div className="group">
            <input
              ref={desktopInputRef}
              id="roomCodeDesktop"
              type="text"
              className="input"
              required
              value={roomCodeInput}
              onChange={(e) => {
                setRoomCodeInput(e.currentTarget.value);
                if (joinWarning) setJoinWarning(null);
              }}
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="highlight" />
            <span className="bar" />
            <label htmlFor="roomCodeDesktop">Room code</label>
          </div>
        </div>

        <button className="btn btn--azure" onClick={() => void tryJoin(roomCodeInput)}>
          Join
        </button>

        {joinWarning && (
          <div className="-mt-1 text-xs text-red-100/90 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
            {joinWarning}
          </div>
        )}

        <button className="btn btn--desert ml-2" onClick={() => setProfileModalOpen(true)}>
          <span role="img" aria-label="profile">
            👤
          </span>
          Edit Profile
        </button>

        <span className="text-sm whitespace-nowrap flex items-center gap-2 text-white/90">
          <span>
            {connected ? 'Connected' : 'Disconnected'}
            {snapshot ? ` • Players ${snapshot.players?.length || 0}/${playerCount}` : ''}
            {mySeat !== null ? ` • You are seat ${mySeat + 1}` : ''}
          </span>
          <RoomBadge inputRef={desktopInputRef} />
        </span>
      </div>
    </>
  );
}
