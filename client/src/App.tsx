import React, { useMemo } from "react";
import TableMat from "./components/TableMat";
import PlayerHand from "./components/PlayerHand";
import OpponentHand from "./components/OpponentHand";
import SeatPanel from "./components/SeatPanel";
import CoffeeProp from "./components/CoffeeProp";
import ChichaProp from "./components/ChichaProp";
import CigarettesProp from "./components/CigarettesProp";
import ScoreBoard from "./components/ScoreBoard";
import { useGameSocket } from "./game/useGameSocket";
import Layout from "./components/Layout";

export default function App() {
  const { connected, roomCode, gameState, roundBanner, lastRound, snapshot, mySeat, dealTick, createRoom, join, play, setProfile, replay, quit } = useGameSocket();
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

  const seats = useMemo(() => {
    return ["You", "Opp 1", "Teammate", "Opp 2"];
  }, []);

  return (
    <Layout
      headerRight={
        <>
          <button className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => createRoom().then((code) => join(code))}>Create & Join</button>
          <input id="roomCode" placeholder="Room code" className="px-3 py-1 rounded-md border border-gray-400 bg-white text-gray-900 placeholder:text-gray-500 shadow-inner" />
          <button className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => {
            const code = (document.getElementById("roomCode") as HTMLInputElement).value.trim();
            if (code) join(code);
          }}>Join</button>
          <span className="text-sm whitespace-nowrap flex items-center gap-2 text-white/90">
            <span className="hidden sm:inline">
              {connected ? "Connected" : "Disconnected"}
              {snapshot ? ` • Players ${snapshot.players?.length || 0}/4` : ""}
              {mySeat !== null ? ` • You are seat ${mySeat + 1}` : ""}
            </span>
            {roomCode && (
              <span className="inline-flex items-center gap-1">
                <span className="px-2 py-0.5 rounded bg-white/20 text-white/90 border border-white/20 shadow-sm">Room {roomCode}</span>
                <button
                  title="Copy room code"
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white shadow-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(roomCode).then(() => {
                      // optional: quick visual feedback
                      const el = document.getElementById("roomCode");
                      if (el) { el.classList.add("ring", "ring-white/40"); setTimeout(() => el.classList.remove("ring", "ring-white/40"), 600); }
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
      {/* End screen overlay when round ended */}
      {roundBanner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="chalkboard-frame">
            <div className="chalkboard-surface">
              <h2 className="chalk-text text-3xl mb-2">Round Summary</h2>
              <p className="chalk-text text-base opacity-90 mb-3">{roundBanner}</p>
              {(() => {
                const scores = lastRound?.scores ?? gameState?.scoresByTeam ?? null;
                if (!scores) return null;
                return (
                  <div className="text-left chalk-text p-3 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="chalk-text text-lg">Team A</span>
                      <span className="chalk-text text-xl">{scores[0]}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="chalk-text text-lg">Team B</span>
                      <span className="chalk-text text-xl">{scores[1]}</span>
                    </div>
                    <div className="chalk-divider my-2" />
                    <div className="chalk-text text-xl">
                      Winner: {scores[0] === scores[1] ? "Tie" : scores[0] > scores[1] ? "Team A" : "Team B"}
                    </div>
                  </div>
                );
              })()}
            {/* Detailed scoring breakdown */}
            {lastRound && (
              <div className="text-left chalk-text p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="chalk-text text-xl">Team A</span>
                  <span className="chalk-text text-2xl">{lastRound.scores[0]}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="chalk-text text-xl">Team B</span>
                  <span className="chalk-text text-2xl">{lastRound.scores[1]}</span>
                </div>
                <div className="chalk-divider my-3" />
                <ul className="space-y-2 text-base">
                  <li className="chalk-text">Elhaya (most cards): {lastRound.details?.mostCards === 0 ? "Team A" : lastRound.details?.mostCards === 1 ? "Team B" : "—"}</li>
                  <li className="chalk-text">Dineri (most diamonds): {lastRound.details?.mostDiamonds === 0 ? "Team A" : lastRound.details?.mostDiamonds === 1 ? "Team B" : "—"}</li>
                  <li className="chalk-text">Karta Bermila (7♦): {lastRound.details?.sevenDiamonds === 0 ? "Team A" : lastRound.details?.sevenDiamonds === 1 ? "Team B" : "—"}</li>
                  <li className="chalk-text">Chkobbas: Team A {lastRound.details?.chkobba?.[0] ?? 0} • Team B {lastRound.details?.chkobba?.[1] ?? 0}</li>
                  <li className="chalk-text">Most 7s (tie-break by 6s): {
                    lastRound.details?.mostSevens === 0 ? "Team A" : lastRound.details?.mostSevens === 1 ? "Team B" : lastRound.details?.mostSevens === "tie" ? "Tie" : "—"
                  }</li>
                </ul>
                {/* Dynamic scoring contribution breakdown */}
                <div className="chalk-divider my-3" />
                <div className="chalk-text">
                  <div className="text-xl mb-2">Points earned by category</div>
                  {(() => {
                    const rows: Array<{ label: string; team: string; points: number }> = [];
                    const teamName = (i: number | "tie" | undefined) => i === 0 ? "Team A" : i === 1 ? "Team B" : i === "tie" ? "Tie" : "—";
                    // Using common scoring: Elhaya 2, Dineri 1, 7♦ 1, Chkobba 1 each, Most 7s 1 (tie-break by 6s)
                    const mostCards = lastRound.details?.mostCards as 0 | 1 | undefined;
                    if (mostCards === 0 || mostCards === 1) rows.push({ label: "Elhaya (most cards)", team: teamName(mostCards), points: 2 });
                    const mostDiamonds = lastRound.details?.mostDiamonds as 0 | 1 | undefined;
                    if (mostDiamonds === 0 || mostDiamonds === 1) rows.push({ label: "Dineri (most diamonds)", team: teamName(mostDiamonds), points: 1 });
                    const sevenDiamonds = lastRound.details?.sevenDiamonds as 0 | 1 | undefined;
                    if (sevenDiamonds === 0 || sevenDiamonds === 1) rows.push({ label: "Karta Bermila (7♦)", team: teamName(sevenDiamonds), points: 1 });
                    const chkA = lastRound.details?.chkobba?.[0] ?? 0;
                    const chkB = lastRound.details?.chkobba?.[1] ?? 0;
                    if (chkA) rows.push({ label: "Chkobbas", team: "Team A", points: chkA });
                    if (chkB) rows.push({ label: "Chkobbas", team: "Team B", points: chkB });
                    const mostSevens = lastRound.details?.mostSevens as 0 | 1 | "tie" | undefined;
                    if (mostSevens === 0 || mostSevens === 1) rows.push({ label: "Most 7s", team: teamName(mostSevens), points: 1 });
                    if (rows.length === 0) return null;
                    return (
                      <div className="grid grid-cols-3 gap-y-1 text-base">
                        <div className="opacity-80">Category</div>
                        <div className="opacity-80">Earned by</div>
                        <div className="opacity-80 text-right">Points</div>
                        {rows.map((r, i) => (
                          <React.Fragment key={i}>
                            <div>{r.label}</div>
                            <div>{r.team}</div>
                            <div className="text-right">{r.points}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="chalk-divider my-3" />
                <div className="chalk-text text-2xl">
                  Winner: {
                    lastRound.scores[0] === lastRound.scores[1]
                      ? "Tie"
                      : lastRound.scores[0] > lastRound.scores[1] ? "Team A" : "Team B"
                  }
                </div>
                {/* Scoring legend */}
                <div className="chalk-divider my-4" />
                <div className="chalk-text">
                  <div className="text-xl mb-2">How scoring works</div>
                  <ul className="space-y-1 text-base">
                    <li>• Most cards (Elhaya): +2 points</li>
                    <li>• Most diamonds (Dineri): +1 point</li>
                    <li>• 7♦ (Karta Bermila): +1 point</li>
                    <li>• Each chkobba: +1 point</li>
                    <li>• Most 7s (tie-break by 6s): +1 point</li>
                  </ul>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-6">
              {/* Uiverse.io Cevorob styled replay button */}
              <button onClick={() => { if (roomCode) replay(roomCode); }} className="replay-btn">
                <span>Replay</span>
              </button>
              <button onClick={() => { if (roomCode) quit(roomCode); }} className="replay-btn replay-btn--danger">
                <span>Quit</span>
              </button>
              <p className="mt-3 chalk-text opacity-80">Waiting for other players to click replay…</p>
            </div>
            </div>
          </div>
        </div>
      )}
      <TableMat>
          {/* Round banner */}
          {/* Inline banner removed in favor of end overlay */}
          {/* Table cards placeholder */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 place-items-center max-w-[640px]">
            {(gameState?.tableCards || []).map((c) => {
              const selected = selectedTableIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    // toggle selection for building combinations
                    setSelectedTableIds((prev) => prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]);
                  }}
                  className={`w-[64px] h-[92px] rounded-lg bg-white border-2 flex flex-col items-center justify-center shadow-md transition-transform duration-200 ease-out cursor-pointer ${selected ? "ring-2 ring-amber-400 border-gray-800 -translate-y-1" : "border-gray-800 hover:-translate-y-0.5"}`}
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
            const countAt = (i: number) => (gameState?.hands?.[i]?.length ?? 0);
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
            const teamName = (i: number) => (teamForSeat(i) === 0 ? "Team A" : "Team B");
            const getProfile = (seatIndex: number) => {
              const sid = seats[seatIndex];
              return sid ? profiles[sid] : null;
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
                  isEditable={true}
                  onSaveProfile={(nickname, avatar) => setProfile(nickname, avatar)}
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
          cards={(mySeat != null && gameState?.hands) ? (gameState.hands[mySeat] || []) : []}
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
            const combo = (selectedTableIds.length && selectedSum === (selectedHandCard?.value ?? -1)) ? selectedTableIds : undefined;
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
            {selectedHandCard ? `Selected: ${selectedHandCard.rank} • Sum: ${selectedSum}` : "Select a card"}
          </div>
          <button
            disabled={!canPlaySelected || !selectedHandCard}
            className={`px-3 py-1 rounded-md text-white shadow-sm ${canPlaySelected && selectedHandCard ? "bg-amber-600 hover:bg-amber-700" : "bg-gray-500 opacity-60 cursor-not-allowed"}`}
            onClick={() => {
              if (!roomCode || !selectedHandCard) return;
              if (mySeat == null) return;
              if (gameState?.currentPlayerIndex !== mySeat) return;
              const combo = (selectedTableIds.length && selectedSum === selectedHandCard.value) ? selectedTableIds : undefined;
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
  );
}
