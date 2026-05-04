import { useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { emitAck, getSocket, type TypedSocket } from './socketClient';
import { SERVER_URL } from './config';
import type { PlayerIndex, RoomSettings } from '../types';
import type { SoundboardSoundFile } from '../lib/soundboard';

type JoinResult = { ok: boolean; msg?: string };

export function useGameNetwork() {
  const socket = useMemo<TypedSocket>(() => getSocket(), []);

  const setConnected = useGameStore((s) => s.setConnected);
  const setSocketId = useGameStore((s) => s.setSocketId);
  const setClockSkew = useGameStore((s) => s.setClockSkew);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const setTurn = useGameStore((s) => s.setTurn);
  const setGameState = useGameStore((s) => s.setGameState);
  const bumpDealTick = useGameStore((s) => s.bumpDealTick);
  const setLastRound = useGameStore((s) => s.setLastRound);
  const setRoundBanner = useGameStore((s) => s.setRoundBanner);
  const setReplayWaiting = useGameStore((s) => s.setReplayWaiting);
  const setSoundboardEvent = useGameStore((s) => s.setSoundboardEvent);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const resetRoom = useGameStore((s) => s.resetRoom);

  useEffect(() => {
    if (socket.disconnected) socket.connect();

    const onConnect = () => {
      setConnected(true);
      setSocketId(socket.id ?? null);
      // Resync if we already had a room: ask the server for the current snapshot.
      const code = useGameStore.getState().roomCode;
      if (code) {
        void emitAck(socket, 'room:join', code);
      }
    };
    const onConnectError = (err: Error) => {
      console.error('[socket] connect_error:', err.message);
      setConnected(false);
    };
    const onDisconnect = (reason: string) => {
      console.warn('[socket] disconnected:', reason);
      setConnected(false);
      setSocketId(null);
    };
    const onSnapshot = (snap: Parameters<typeof setSnapshot>[0]) => {
      setSnapshot(snap, socket.id ?? null);
      if (snap?.turn) setTurn(snap.turn);
    };
    const onGameStart = (state: Parameters<typeof setGameState>[0]) => {
      setGameState(state);
      bumpDealTick();
    };
    const onTurnTimer = (payload: { endsAt: number; durationMs: number; serverNow?: number }) => {
      setTurn({ endsAt: payload.endsAt, durationMs: payload.durationMs });
      if (typeof payload.serverNow === 'number') {
        setClockSkew(payload.serverNow - Date.now());
      }
    };
    const onRoundEnd = (payload: { scores: [number, number]; details: unknown }) => {
      setLastRound(payload);
      setRoundBanner(`Round ended • Team A: ${payload.scores[0]} • Team B: ${payload.scores[1]}`);
    };
    const onReplayStatus = (payload: { count: number; total: number }) => {
      setReplayWaiting(payload);
      setRoundBanner(`Waiting for players: ${payload.count}/${payload.total}`);
    };
    const onSoundboard = (payload: { seatIndex: PlayerIndex; soundFile: SoundboardSoundFile }) => {
      setSoundboardEvent({
        seatIndex: payload.seatIndex,
        soundFile: payload.soundFile,
        t: Date.now(),
      });
    };
    const onRoomClosed = () => {
      resetRoom();
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onSnapshot);
    socket.on('room:snapshot', onSnapshot);
    socket.on('game:start', onGameStart);
    socket.on('game:update', setGameState);
    socket.on('game:turnTimer', onTurnTimer);
    socket.on('game:roundEnd', onRoundEnd);
    socket.on('game:replayStatus', onReplayStatus);
    socket.on('game:soundboard', onSoundboard);
    socket.on('room:closed', onRoomClosed);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('room:update', onSnapshot);
      socket.off('room:snapshot', onSnapshot);
      socket.off('game:start', onGameStart);
      socket.off('game:update', setGameState);
      socket.off('game:turnTimer', onTurnTimer);
      socket.off('game:roundEnd', onRoundEnd);
      socket.off('game:replayStatus', onReplayStatus);
      socket.off('game:soundboard', onSoundboard);
      socket.off('room:closed', onRoomClosed);
    };
  }, [
    socket,
    setConnected,
    setSocketId,
    setClockSkew,
    setSnapshot,
    setTurn,
    setGameState,
    bumpDealTick,
    setLastRound,
    setRoundBanner,
    setReplayWaiting,
    setSoundboardEvent,
    resetRoom,
  ]);

  // ── Actions ──────────────────────────────────────────────
  const createRoom = async (): Promise<string> => {
    const r = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { code: string };
    setRoomCode(j.code);
    return j.code;
  };

  const join = async (code: string): Promise<JoinResult> => {
    const res = await emitAck(socket, 'room:join', code);
    if (res.ok) setRoomCode(code);
    return res;
  };

  const play = (code: string, cardId: string, combo?: string[]) =>
    emitAck(socket, 'game:play', { code, cardId, combo });

  const updateRoomSettings = (code: string, settings: Partial<RoomSettings>) =>
    emitAck(socket, 'room:settings', { code, settings });

  const launchGame = (code: string) => emitAck(socket, 'game:launch', { code });

  const setProfile = (nickname?: string, avatar?: string) =>
    emitAck(socket, 'profile:set', { nickname, avatar });

  const replay = (code: string) => emitAck(socket, 'game:replay', { code });

  const playSoundboard = (code: string, soundFile: SoundboardSoundFile) =>
    emitAck(socket, 'game:soundboard', { code, soundFile });

  const renameTeam = (code: string, teamIndex: 0 | 1, name: string) =>
    emitAck(socket, 'team:rename', { code, teamIndex, name });

  const quit = (code: string) => emitAck(socket, 'room:quit', { code });

  return {
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

export type GameNetwork = ReturnType<typeof useGameNetwork>;
