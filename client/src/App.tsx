import React, { useMemo } from "react";
import TableMat from "./components/TableMat";
import PlayerHand from "./components/PlayerHand";
import OpponentHand from "./components/OpponentHand";
import CoffeeProp from "./components/CoffeeProp";
import ChichaProp from "./components/ChichaProp";
import CigarettesProp from "./components/CigarettesProp";
import ScoreBoard from "./components/ScoreBoard";
import { useGameSocket } from "./game/useGameSocket";

export default function App() {
  const { connected, roomCode, gameState, createRoom, join, play } = useGameSocket();

  const seats = useMemo(() => {
    return ["You", "Opp 1", "Teammate", "Opp 2"];
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#8b6b4a" /* wooden table */ }}>
      <div style={{ padding: 8, display: "flex", gap: 8 }}>
        <button onClick={() => createRoom().then((code) => join(code))}>Create & Join</button>
        <input id="roomCode" placeholder="Room code" />
        <button onClick={() => {
          const code = (document.getElementById("roomCode") as HTMLInputElement).value.trim();
          if (code) join(code);
        }}>Join</button>
        <span>{connected ? "Connected" : "Disconnected"} {roomCode ? `• Room ${roomCode}` : ""}</span>
      </div>

      <div style={{ position: "relative", width: "100%", height: "calc(100% - 50px)" }}>
        <TableMat>
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

          {/* Seat/team indicators */}
          <div style={{ position: "absolute", top: 8, right: 8, color: "#fff" }}>Seat 1 (Team B)</div>
          <div style={{ position: "absolute", top: "50%", left: 8, transform: "translateY(-50%)", color: "#fff" }}>Seat 2 (Team A)</div>
          <div style={{ position: "absolute", top: "50%", right: 8, transform: "translateY(-50%)", color: "#fff" }}>Seat 4 (Team B)</div>

          {/* Props */}
          <CoffeeProp />
          <ChichaProp />
          <CigarettesProp />

          {/* Scoreboard */}
          <ScoreBoard state={gameState || null} />
        </TableMat>

        {/* Player hand at bottom */}
        <div style={{ position: "absolute", bottom: 0, width: "100%" }}>
          <PlayerHand cards={gameState?.hands?.[0] || []} onPlay={(id) => {
            if (!roomCode) return;
            play(roomCode, id);
          }} />
        </div>
      </div>
    </div>
  );
}
