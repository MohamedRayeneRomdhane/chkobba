import { io, Socket } from 'socket.io-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, PlayerIndex, RoomSettings, RoomSnapshot } from '../types';
import type { SoundboardSoundFile } from '../lib/soundboard';

// Resolve server URL: prefer env, fallback to localhost in dev, else Render
const env = (import.meta as unknown as { env: { VITE_SERVER_URL?: string; DEV?: boolean } }).env;
const SERVER_URL: string =
  env.VITE_SERVER_URL || (env.DEV ? 'http://localhost:3001' : 'https://chkobba-5zq3.onrender.com');

export function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [lastRound, setLastRound] = useState<{ scores: [number, number]; details: unknown } | null>(
    null
  );
  const [replayWaiting, setReplayWaiting] = useState<{ count: number; total: number } | null>(null);
  const [soundboardEvent, setSoundboardEvent] = useState<{
    seatIndex: PlayerIndex;
    soundFile: SoundboardSoundFile;
    t: number;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [mySeat, setMySeat] = useState<PlayerIndex | null>(null);
  const [dealTick, setDealTick] = useState<number>(0);
  const [turn, setTurn] = useState<{ endsAt: number; durationMs: number } | null>(null);
  const [clockSkewMs, setClockSkewMs] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);

  const socket = useMemo(() => {
    if (!socketRef.current) {
      socketRef.current = io(SERVER_URL, { withCredentials: false });
    }
    return socketRef.current;
  }, []);

  useEffect(() => {
    // Reconnect if the socket was disconnected (e.g. React StrictMode cleanup)
    if (socket.disconnected) {
      socket.connect();
    }

    function handleSnapshot(snap: RoomSnapshot) {
      setSnapshot(snap);
      setTurn(snap.turn ?? null);
      const idx = snap.seats?.findIndex((s: string | null) => s === socket.id);
      if (idx !== undefined && idx >= 0) setMySeat(idx as PlayerIndex);
    }

    socket.on('connect', () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
    });
    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err.message);
      setConnected(false);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnected:', reason);
      setConnected(false);
      setSocketId(null);
    });
    socket.on('room:update', handleSnapshot);
    socket.on('room:snapshot', handleSnapshot);
    socket.on('game:start', (state: GameState) => {
      setGameState(state);
      setDealTick((x) => x + 1);
      // Do not clear replayWaiting/banner here; overlay logic will check count vs total
    });
    socket.on('game:update', (state: GameState) => setGameState(state));
    socket.on(
      'game:turnTimer',
      (payload: {
        currentPlayerIndex: number;
        endsAt: number;
        durationMs: number;
        serverNow?: number;
      }) => {
        setTurn({ endsAt: payload.endsAt, durationMs: payload.durationMs });
        if (typeof payload.serverNow === 'number') {
          setClockSkewMs(payload.serverNow - Date.now());
        }
      }
    );
    socket.on('game:roundEnd', (payload: { scores: [number, number]; details: unknown }) => {
      setLastRound(payload);
      setRoundBanner(`Round ended • Team A: ${payload.scores[0]} • Team B: ${payload.scores[1]}`);
      // do not auto-hide; show end screen until replay or quit
    });
    socket.on('game:replayStatus', (payload: { count: number; total: number }) => {
      setReplayWaiting(payload);
      setRoundBanner(`Waiting for players: ${payload.count}/${payload.total}`);
    });
    socket.on(
      'game:soundboard',
      (payload: { seatIndex: number; soundFile: SoundboardSoundFile }) => {
        const seatIndex = payload.seatIndex as PlayerIndex;
        setSoundboardEvent({ seatIndex, soundFile: payload.soundFile, t: Date.now() });
      }
    );
    socket.on('room:closed', () => {
      setRoundBanner(null);
      setReplayWaiting(null);
      setLastRound(null);
      setGameState(null);
      setSnapshot(null);
      setRoomCode(null);
      setMySeat(null);
      setTurn(null);
      setClockSkewMs(0);
    });
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('room:update');
      socket.off('room:snapshot');
      socket.off('game:start');
      socket.off('game:update');
      socket.off('game:turnTimer');
      socket.off('game:roundEnd');
      socket.off('game:replayStatus');
      socket.off('game:soundboard');
      socket.off('room:closed');
      socket.disconnect();
    };
  }, [socket]);

  /** Emit with a timeout so promises never hang indefinitely. */
  function emitWithTimeout<T>(
    event: string,
    payload: unknown,
    parse: (...args: unknown[]) => T,
    timeoutMs = 8_000
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Socket emit "${event}" timed out`));
      }, timeoutMs);
      socket.emit(event, payload, (...args: unknown[]) => {
        clearTimeout(timer);
        resolve(parse(...args));
      });
    });
  }

  function createRoom() {
    return fetch(`${SERVER_URL}/api/rooms`, { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => j.code as string)
      .then((code) => {
        setRoomCode(code);
        return code;
      });
  }
  function join(code: string) {
    return emitWithTimeout('room:join', code, (ok: unknown, msg: unknown) => {
      if (ok) setRoomCode(code);
      return { ok: !!ok, msg: msg as string | undefined };
    }).catch((e) => ({ ok: false, msg: (e as Error).message }));
  }
  function play(code: string, cardId: string, combo?: string[]) {
    return emitWithTimeout('game:play', { code, cardId, combo }, (ok: unknown) => !!ok).catch(
      () => false
    );
  }

  function updateRoomSettings(code: string, settings: Partial<RoomSettings>) {
    return emitWithTimeout('room:settings', { code, settings }, (ok: unknown, msg: unknown) => ({
      ok: !!ok,
      msg: msg as string | undefined,
    })).catch((e) => ({ ok: false, msg: (e as Error).message }));
  }

  function launchGame(code: string) {
    return emitWithTimeout('game:launch', { code }, (ok: unknown, msg: unknown) => ({
      ok: !!ok,
      msg: msg as string | undefined,
    })).catch((e) => ({ ok: false, msg: (e as Error).message }));
  }

  function setProfile(nickname?: string, avatar?: string) {
    return emitWithTimeout('profile:set', { nickname, avatar }, (ok: unknown) => !!ok).catch(
      () => false
    );
  }

  function replay(code: string) {
    return emitWithTimeout('game:replay', { code }, (ok: unknown) => !!ok).catch(() => false);
  }

  function playSoundboard(code: string, soundFile: SoundboardSoundFile) {
    return emitWithTimeout('game:soundboard', { code, soundFile }, (ok: unknown) => !!ok).catch(
      () => false
    );
  }

  function renameTeam(code: string, teamIndex: 0 | 1, name: string) {
    return emitWithTimeout(
      'team:rename',
      { code, teamIndex, name },
      (ok: unknown, msg: unknown) => ({ ok: !!ok, msg: msg as string | undefined })
    ).catch((e) => ({ ok: false, msg: (e as Error).message }));
  }

  function quit(code: string) {
    return emitWithTimeout('room:quit', { code }, (ok: unknown) => !!ok).catch(() => false);
  }

  return {
    connected,
    socketId,
    roomCode,
    gameState,
    roundBanner,
    lastRound,
    replayWaiting,
    soundboardEvent,
    snapshot,
    mySeat,
    dealTick,
    turn,
    clockSkewMs,
    createRoom,
    join,
    play,
    updateRoomSettings,
    launchGame,
    setProfile,
    replay,
    playSoundboard,
    renameTeam,
    quit,
  };
}
