import React, { useState } from 'react';
import ProfileModal from './components/ProfileModal';
import { useProfile } from './hooks/useProfile';
import TableMat from './components/TableMat';
import PlayerHand from './components/PlayerHand';
import OpponentHand from './components/OpponentHand';
import SeatPanel from './components/SeatPanel';
import CoffeeProp from './components/CoffeeProp';
import ChichaProp from './components/ChichaProp';
import CigarettesProp from './components/CigarettesProp';
import ScoreBoard from './components/ScoreBoard';
import { useGameSocket } from './game/useGameSocket';
import EndOverlay from './components/EndOverlay';
import Layout from './components/Layout';
import { getCardImage } from './game/cardAssets';
import PlayAnimationsLayer from './components/PlayAnimationsLayer';
import usePlayAnimations from './hooks/usePlayAnimations';
import useSound from './hooks/useSound';
import FooterNote from './components/FooterNote';

export default function App() {
  const {
    connected,
    roomCode,
    gameState,
    roundBanner,
    lastRound,
    replayWaiting,
    snapshot,
    mySeat,
    dealTick,
    createRoom,
    join,
    play,
    setProfile,
    replay,
    quit,
  } = useGameSocket();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { profile: localProfile, setProfile: setLocalProfile } = useProfile();
  const [selectedHandId, setSelectedHandId] = React.useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = React.useState<string[]>([]);
  const [handGhostIndex, setHandGhostIndex] = React.useState<number | null>(null);
  // Deal tick sound per card animation start
  const { play: playDealTick } = useSound('/assets/soundeffects/deal.mp3', {
    volume: 0.7,
    loop: false,
    interrupt: true,
  });
  const selectedHandCard = React.useMemo(() => {
    if (mySeat == null || !gameState?.hands) return null;
    return (gameState.hands[mySeat] || []).find((c) => c.id === selectedHandId) || null;
  }, [selectedHandId, gameState, mySeat]);
  const selectedSum = React.useMemo(() => {
    const byId = new Map((gameState?.tableCards || []).map((c) => [c.id, c]));
    return selectedTableIds.reduce((s, id) => s + (byId.get(id)?.value || 0), 0);
  }, [selectedTableIds, gameState]);
  const canPlaySelected = React.useMemo(() => {
    if (!selectedHandCard) return false;
    // allow play with no combo (place on table) or exact sum combo
    return selectedTableIds.length === 0 || selectedSum === selectedHandCard.value;
  }, [selectedHandCard, selectedTableIds, selectedSum]);

  const { flights: pendingFlights, clearFlights } = usePlayAnimations(
    gameState,
    mySeat,
    selectedHandCard
  );

  // removed unused local `seats` label array

  return (
    <>
      <Layout
        headerRight={
          <>
            <button
              className="btn btn--mint"
              onClick={() => createRoom().then((code) => join(code))}
            >
              Create & Join
            </button>
            <div className="room-input">
              <div className="group">
                <input id="roomCode" type="text" className="input" required />
                <span className="highlight" />
                <span className="bar" />
                <label htmlFor="roomCode">Room code</label>
              </div>
            </div>
            <button
              className="btn btn--azure"
              onClick={() => {
                const code = (document.getElementById('roomCode') as HTMLInputElement).value.trim();
                if (code) join(code);
              }}
            >
              Join
            </button>
            <button className="btn btn--desert ml-2" onClick={() => setProfileModalOpen(true)}>
              <span role="img" aria-label="profile">
                👤
              </span>
              Edit Profile
            </button>
            <span className="text-sm whitespace-nowrap flex items-center gap-2 text-white/90">
              <span className="hidden sm:inline">
                {connected ? 'Connected' : 'Disconnected'}
                {snapshot ? ` • Players ${snapshot.players?.length || 0}/4` : ''}
                {mySeat !== null ? ` • You are seat ${mySeat + 1}` : ''}
              </span>
              {roomCode && (
                <span className="inline-flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white/90 border border-white/20 shadow-sm">
                    Room {roomCode}
                  </span>
                  <button
                    title="Copy room code"
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white shadow-sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(roomCode).then(() => {
                        // optional: quick visual feedback
                        const el = document.getElementById('roomCode');
                        if (el) {
                          el.classList.add('ring', 'ring-white/40');
                          setTimeout(() => el.classList.remove('ring', 'ring-white/40'), 600);
                        }
                      });
                    }}
                  >
                    <span aria-hidden>📋</span>
                  </button>
                </span>
              )}
            </span>
          </>
        }
        footerLeft={<FooterNote />}
      >
        {/* End screen overlay: show after round end and until all replays */}
        {(() => {
          const waitingForReplay = replayWaiting ? replayWaiting.count < replayWaiting.total : true; // if replayWaiting not loaded yet, keep overlay visible after end
          const shouldShowOverlay = !!lastRound && waitingForReplay;
          return shouldShowOverlay;
        })() && (
          <EndOverlay
            banner={roundBanner}
            scores={lastRound?.scores ?? gameState?.scoresByTeam ?? null}
            details={lastRound?.details ?? null}
            replayWaiting={replayWaiting}
            onReplay={() => {
              if (roomCode) replay(roomCode);
            }}
            onQuit={() => {
              if (roomCode) quit(roomCode);
            }}
          />
        )}
        <div className="h-full min-h-0 flex flex-col gap-1.5 sm:gap-2">
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <TableMat>
              {/* Round banner */}
              {/* Inline banner removed in favor of end overlay */}
              {/* Table cards placeholder */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 place-items-center max-w-[90%]"
                id="table-grid"
              >
                {(gameState?.tableCards || []).map((c) => {
                  const selected = selectedTableIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      onClick={() => {
                        // toggle selection for building combinations
                        setSelectedTableIds((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`w-[clamp(48px,8vmin,92px)] aspect-[2/3] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out cursor-pointer ${selected ? 'ring-2 ring-amber-400 border-gray-800 -translate-y-1' : 'border-gray-800 hover:-translate-y-0.5'}`}
                    >
                      <img
                        src={getCardImage(c)}
                        alt={`${c.rank} of ${c.suit}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>

          {/* Opponents (relative to local seat) */}
          {(() => {
            const idxBottom = mySeat ?? 0;
            const idxRight = (idxBottom + 1) % 4;
            const idxTop = (idxBottom + 2) % 4;
            const idxLeft = (idxBottom + 3) % 4;
            const countAt = (i: number) => gameState?.hands?.[i]?.length ?? 0;
            return (
              <>
                <OpponentHand
                  position="top"
                  count={countAt(idxTop)}
                  dealTick={dealTick}
                  onDealAnimStart={playDealTick}
                />
                <OpponentHand
                  position="left"
                  count={countAt(idxLeft)}
                  dealTick={dealTick}
                  onDealAnimStart={playDealTick}
                />
                <OpponentHand
                  position="right"
                  count={countAt(idxRight)}
                  dealTick={dealTick}
                  onDealAnimStart={playDealTick}
                />
              </>
            );
          })()}

          {/* Avatar + nickname panels per seat (rotate so local seat is bottom) */}
          {(() => {
            const seats = snapshot?.seats || [null, null, null, null];
            const profiles = snapshot?.profiles || {};
            const current = gameState?.currentPlayerIndex ?? null;
            const idxBottom = mySeat ?? 0;
            const idxRight = (idxBottom + 1) % 4;
            const idxTop = (idxBottom + 2) % 4;
            const idxLeft = (idxBottom + 3) % 4;
            const teamForSeat = (i: number) => (i % 2 === 0 ? 0 : 1); // [0,2] -> Team A, [1,3] -> Team B
            const teamName = (i: number) => (teamForSeat(i) === 0 ? 'Team A' : 'Team B');
            const getProfile = (seatIndex: number) => {
              const sid = seats[seatIndex];
              const fromSnapshot = sid ? profiles[sid] : null;
              if (seatIndex === idxBottom) {
                return (
                  fromSnapshot ??
                  (localProfile.nickname || localProfile.avatar
                    ? { nickname: localProfile.nickname, avatar: localProfile.avatar }
                    : null)
                );
              }
              return fromSnapshot;
            };
            return (
              <>
                {/* Top opponent */}
                <SeatPanel
                  position="top"
                  avatar={getProfile(idxTop)?.avatar}
                  nickname={getProfile(idxTop)?.nickname}
                  highlight={current === idxTop}
                  teamLabel={teamName(idxTop)}
                  teamIndex={teamForSeat(idxTop) as 0 | 1}
                  compact
                />
                {/* Left opponent */}
                <SeatPanel
                  position="left"
                  avatar={getProfile(idxLeft)?.avatar}
                  nickname={getProfile(idxLeft)?.nickname}
                  highlight={current === idxLeft}
                  teamLabel={teamName(idxLeft)}
                  teamIndex={teamForSeat(idxLeft) as 0 | 1}
                  compact
                />
                {/* Right opponent */}
                <SeatPanel
                  position="right"
                  avatar={getProfile(idxRight)?.avatar}
                  nickname={getProfile(idxRight)?.nickname}
                  highlight={current === idxRight}
                  teamLabel={teamName(idxRight)}
                  teamIndex={teamForSeat(idxRight) as 0 | 1}
                  compact
                />
                {/* Local player */}
                <SeatPanel
                  position="bottom"
                  avatar={getProfile(idxBottom)?.avatar}
                  nickname={getProfile(idxBottom)?.nickname}
                  highlight={current === idxBottom}
                  teamLabel={teamName(idxBottom)}
                  teamIndex={teamForSeat(idxBottom) as 0 | 1}
                />
              </>
            );
          })()}

          {/* Props */}
          <CoffeeProp />
          <ChichaProp />
          <CigarettesProp />

          {/* Scoreboard */}
          <ScoreBoard state={gameState || null} />
              <PlayAnimationsLayer
                flights={pendingFlights}
                onDone={() => {
                  clearFlights();
                  setHandGhostIndex(null);
                }}
              />
            </TableMat>
          </div>

          {/* Player hand outside (below) the table */}
          <div className="w-full shrink-0 flex flex-col items-center justify-center">
            <PlayerHand
              cards={mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : []}
              selectedId={selectedHandId}
              ghostIndex={handGhostIndex}
              onSelect={(id) => {
              // re-clicking toggles: if same id selected, either discard (no table selected) or deselect
              if (selectedHandId === id) {
                if (canPlaySelected && selectedTableIds.length === 0) {
                  // discard: place on table
                  if (!roomCode || mySeat == null) return;
                  if (gameState?.currentPlayerIndex !== mySeat) return;
                  // fade out the actual card for a quick, smooth removal
                  const el = document.querySelector(
                    `[data-hand-card-id="${id}"]`
                  ) as HTMLElement | null;
                  if (el) {
                    el.style.willChange = 'opacity';
                    el.style.transition = 'opacity 220ms ease-out';
                    el.style.opacity = '0';
                  }
                  const handNow =
                    mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : [];
                  const idx = handNow.findIndex((c) => c.id === id);
                  if (idx >= 0) setHandGhostIndex(idx);
                  play(roomCode, id, undefined).then(() => {
                    setSelectedHandId(null);
                    setSelectedTableIds([]);
                  });
                } else {
                  setSelectedHandId(null);
                }
              } else {
                setSelectedHandId(id);
              }
              }}
              onPlay={(id) => {
              if (!roomCode) return;
              if (mySeat == null) return;
              if (gameState?.currentPlayerIndex !== mySeat) return;
              // fade out the actual card for a quick, smooth removal
              const el = document.querySelector(
                `[data-hand-card-id="${id}"]`
              ) as HTMLElement | null;
              if (el) {
                el.style.willChange = 'opacity';
                el.style.transition = 'opacity 220ms ease-out';
                el.style.opacity = '0';
              }
              const handNow =
                mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : [];
              const idx = handNow.findIndex((c) => c.id === id);
              if (idx >= 0) setHandGhostIndex(idx);
              const combo =
                selectedTableIds.length && selectedSum === (selectedHandCard?.value ?? -1)
                  ? selectedTableIds
                  : undefined;
              play(roomCode, id, combo).then(() => {
                setSelectedHandId(null);
                setSelectedTableIds([]);
              });
              }}
              dealTick={dealTick}
              onDealAnimStart={playDealTick}
            />
            {/* Action bar for selected play */}
            <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm px-2 py-1 rounded bg-white/70 shadow">
                {selectedHandCard
                  ? `Selected: ${selectedHandCard.rank} • Sum: ${selectedSum}`
                  : 'Select a card'}
              </div>
              <button
                disabled={!canPlaySelected || !selectedHandCard}
                className={`px-3 py-1 rounded-md text-white shadow-sm ${canPlaySelected && selectedHandCard ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 opacity-60 cursor-not-allowed'}`}
                onClick={() => {
                if (!roomCode || !selectedHandCard) return;
                if (mySeat == null) return;
                if (gameState?.currentPlayerIndex !== mySeat) return;
                // fade out the actual card for a quick, smooth removal
                const el = document.querySelector(
                  `[data-hand-card-id="${selectedHandCard.id}"]`
                ) as HTMLElement | null;
                if (el) {
                  el.style.willChange = 'opacity';
                  el.style.transition = 'opacity 220ms ease-out';
                  el.style.opacity = '0';
                }
                const handNow =
                  mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : [];
                const idx = handNow.findIndex((c) => c.id === selectedHandCard.id);
                if (idx >= 0) setHandGhostIndex(idx);
                const combo =
                  selectedTableIds.length && selectedSum === selectedHandCard.value
                    ? selectedTableIds
                    : undefined;
                play(roomCode, selectedHandCard.id, combo).then(() => {
                  setSelectedHandId(null);
                  setSelectedTableIds([]);
                });
                }}
              >
                Play Selected
              </button>
            </div>
          </div>
        </div>
      </Layout>
      {/* Profile modal for editing profile anytime */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialNickname={localProfile.nickname}
        initialAvatar={localProfile.avatar}
        onSave={(nickname: string, avatar?: string) => {
          setProfile(nickname, avatar);
          setLocalProfile(nickname || undefined, avatar || undefined);
        }}
      />
    </>
  );
}
