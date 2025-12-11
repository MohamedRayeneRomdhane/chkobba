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
import ProfileEditor from "./components/ProfileEditor";
import Layout from "./components/Layout";

export default function App() {
  const { connected, roomCode, gameState, roundBanner, snapshot, mySeat, createRoom, join, play, setProfile } = useGameSocket();

  const seats = useMemo(() => {
    return ["You", "Opp 1", "Teammate", "Opp 2"];
  }, []);

  return (
    <Layout
      headerRight={
        <>
          <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={() => createRoom().then((code) => join(code))}>Create & Join</button>
          <input id="roomCode" placeholder="Room code" className="px-2 py-1 rounded border border-gray-400" />
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => {
            const code = (document.getElementById("roomCode") as HTMLInputElement).value.trim();
            if (code) join(code);
          }}>Join</button>
          <span className="text-sm">
            {connected ? "Connected" : "Disconnected"}
            {roomCode ? ` • Room ${roomCode}` : ""}
            {snapshot ? ` • Players ${snapshot.players?.length || 0}/4` : ""}
            {mySeat !== null ? ` • You are seat ${mySeat + 1}` : ""}
          </span>
          <ProfileEditor onSave={(nickname, avatar) => { setProfile(nickname, avatar); }} />
        </>
      }
    >
      <TableMat>
          {/* Round banner */}
          {roundBanner && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-2 rounded-lg shadow">
              {roundBanner}
            </div>
          )}
          {/* Table cards placeholder */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", gap: 12 }}>
            {(gameState?.tableCards || []).map((c) => (
              <div key={c.id} style={{ width: 70, height: 100, borderRadius: 8, background: "#fff", border: "2px solid #333", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontWeight: 700 }}>{c.rank}</div>
                <div style={{ fontSize: 12 }}>{c.suit}</div>
              </div>
            ))}
          </div>

          {/* Opponents */}
          <OpponentHand position="top" />
          <OpponentHand position="left" />
          <OpponentHand position="right" />

          {/* Avatar + nickname panels per seat */}
          {(() => {
            const seats = snapshot?.seats || [null, null, null, null];
            const profiles = snapshot?.profiles || {};
            const current = gameState?.currentPlayerIndex ?? null;
            const getProfile = (seatIndex: number) => {
              const sid = seats[seatIndex];
              return sid ? profiles[sid] : null;
            };
            return (
              <>
                <SeatPanel
                  position="top"
                  avatar={getProfile(1)?.avatar}
                  nickname={getProfile(1)?.nickname}
                  highlight={current === 1}
                />
                <SeatPanel
                  position="left"
                  avatar={getProfile(2)?.avatar}
                  nickname={getProfile(2)?.nickname}
                  highlight={current === 2}
                />
                <SeatPanel
                  position="right"
                  avatar={getProfile(3)?.avatar}
                  nickname={getProfile(3)?.nickname}
                  highlight={current === 3}
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

      {/* Bottom seat panel for local player with profile edit */}
      <SeatPanel
        position="bottom"
        avatar={
          mySeat != null && snapshot?.seats ? snapshot?.profiles?.[snapshot.seats[mySeat]]?.avatar : undefined
        }
        nickname={
          mySeat != null && snapshot?.seats ? snapshot?.profiles?.[snapshot.seats[mySeat]]?.nickname : undefined
        }
        highlight={gameState?.currentPlayerIndex === mySeat}
        isEditable={true}
        onSaveProfile={(nickname, avatar) => setProfile(nickname, avatar)}
      />
      {/* Player hand outside (below) the table */}
      <div className="w-full flex justify-center mt-2">
        <PlayerHand
          cards={(mySeat != null && gameState?.hands) ? (gameState.hands[mySeat] || []) : []}
          onPlay={(id) => {
            if (!roomCode) return;
            if (mySeat == null) return;
            if (gameState?.currentPlayerIndex !== mySeat) return;
            play(roomCode, id);
          }}
        />
      </div>
    </Layout>
  );
}
