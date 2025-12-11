import { io, Socket } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState } from "../types";

export function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
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
      // noop for now
    });
    socket.on("game:start", (state: GameState) => setGameState(state));
    socket.on("game:update", (state: GameState) => setGameState(state));
    socket.on("game:roundEnd", (payload: { scores: [number, number]; details: any }) => {
      setRoundBanner(`Round ended • Team A: ${payload.scores[0]} • Team B: ${payload.scores[1]}`);
      setTimeout(() => setRoundBanner(null), 3000);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:update");
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
      socket.emit("room:join", code, (ok: boolean) => resolve(ok));
    });
  }
  function play(code: string, cardId: string, combo?: string[]) {
    return new Promise<boolean>((resolve) => {
      socket.emit("game:play", { code, cardId, combo }, (ok: boolean) => resolve(ok));
    });
  }

  return { connected, roomCode, gameState, roundBanner, createRoom, join, play };
}
