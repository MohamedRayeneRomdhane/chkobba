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

  // removed unused local `seats` label array

  return (
    <>
      <Layout
        headerRight={
          <>
            <button
              className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white shadow-sm"
              onClick={() => createRoom().then((code) => join(code))}
            >
              Create & Join
            </button>
            <input
              id="roomCode"
              placeholder="Room code"
              className="px-3 py-1 rounded-md border border-gray-400 bg-white text-gray-900 placeholder:text-gray-500 shadow-inner"
            />
            <button
              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => {
                const code = (document.getElementById('roomCode') as HTMLInputElement).value.trim();
                if (code) join(code);
              }}
            >
              Join
            </button>
            <button
              className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-800 text-white shadow-sm ml-2 flex items-center gap-2"
              onClick={() => setProfileModalOpen(true)}
            >
              <span role="img" aria-label="profile">
                👤
              </span>{' '}
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
      >
        {/* End screen overlay: show during round end or until all replay votes */}
        {(lastRound || (replayWaiting && replayWaiting.count < replayWaiting.total)) && (
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
        <TableMat>
          {/* Round banner */}
          {/* Inline banner removed in favor of end overlay */}
          {/* Table cards placeholder */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 place-items-center max-w-[90%]">
            {(gameState?.tableCards || []).map((c) => {
              const selected = selectedTableIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    // toggle selection for building combinations
                    setSelectedTableIds((prev) =>
                      prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                    );
                  }}
                  className={`w-[48px] h-[72px] sm:w-[58px] sm:h-[84px] md:w-[64px] md:h-[92px] rounded-lg bg-white border-2 flex flex-col items-center justify-center shadow-md transition-transform duration-200 ease-out cursor-pointer ${selected ? 'ring-2 ring-amber-400 border-gray-800 -translate-y-1' : 'border-gray-800 hover:-translate-y-0.5'}`}
                >
                  <div className="font-bold">{c.rank}</div>
                  <div className="text-xs">{c.suit}</div>
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
                <OpponentHand position="top" count={countAt(idxTop)} />
                <OpponentHand position="left" count={countAt(idxLeft)} />
                <OpponentHand position="right" count={countAt(idxRight)} />
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
        </TableMat>

        {/* Player hand outside (below) the table */}
        <div className="w-full flex justify-center mt-2">
          <PlayerHand
            cards={mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : []}
            selectedId={selectedHandId}
            onSelect={(id) => {
              // re-clicking toggles: if same id selected, either discard (no table selected) or deselect
              if (selectedHandId === id) {
                if (canPlaySelected && selectedTableIds.length === 0) {
                  // discard: place on table
                  if (!roomCode || mySeat == null) return;
                  if (gameState?.currentPlayerIndex !== mySeat) return;
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
          />
          {/* Action bar for selected play */}
          <div className="mt-1 flex items-center justify-center gap-3">
            <div className="text-sm px-2 py-1 rounded bg-white/70 shadow">
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
