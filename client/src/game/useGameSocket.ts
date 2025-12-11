import { io, Socket } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState } from "../types";
import type { PlayerIndex } from "../types";

export function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [mySeat, setMySeat] = useState<PlayerIndex | null>(null);
  const [dealTick, setDealTick] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  const socket = useMemo(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
    }
    return socketRef.current;
  }, []);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:update", (room) => {
      setSnapshot(room);
      const idx = room.seats?.findIndex((s: string | null) => s === socket.id);
      if (idx !== undefined && idx >= 0) setMySeat(idx as PlayerIndex);
    });
    socket.on("room:snapshot", (snap) => {
      setSnapshot(snap);
      const idx = snap.seats?.findIndex((s: string | null) => s === socket.id);
      if (idx !== undefined && idx >= 0) setMySeat(idx as PlayerIndex);
    });
    socket.on("game:start", (state: GameState) => { setGameState(state); setDealTick((x) => x + 1); });
    socket.on("game:update", (state: GameState) => setGameState(state));
    socket.on("game:roundEnd", (payload: { scores: [number, number]; details: any }) => {
      setRoundBanner(`Round ended • Team A: ${payload.scores[0]} • Team B: ${payload.scores[1]}`);
      setTimeout(() => setRoundBanner(null), 3000);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:update");
      socket.off("room:snapshot");
      socket.off("game:start");
      socket.off("game:update");
      socket.off("game:roundEnd");
    };
  }, [socket]);

  function createRoom() {
    return fetch("http://localhost:3001/api/rooms", { method: "POST" })
      .then((r) => r.json())
      .then((j) => j.code as string)
      .then((code) => {
        setRoomCode(code);
        return code;
      });
  }
  function join(code: string) {
    return new Promise<boolean>((resolve) => {
      socket.emit("room:join", code, (ok: boolean) => {
        if (ok) {
          setRoomCode(code);
        }
        resolve(ok);
      });
    });
  }
  function play(code: string, cardId: string, combo?: string[]) {
    return new Promise<boolean>((resolve) => {
      socket.emit("game:play", { code, cardId, combo }, (ok: boolean) => resolve(ok));
    });
  }

  function setProfile(nickname?: string, avatar?: string) {
    return new Promise<boolean>((resolve) => {
      socket.emit("profile:set", { nickname, avatar }, (ok: boolean) => resolve(ok));
    });
  }

  return { connected, roomCode, gameState, roundBanner, snapshot, mySeat, dealTick, createRoom, join, play, setProfile };
}
