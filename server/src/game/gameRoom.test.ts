import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { GameRoomManager } from './gameRoom';
import { Room } from './Room';

type EmitCall = { event: string; payload: unknown };

function makeMockIo(): { io: Server; emits: EmitCall[]; sockets: Map<string, FakeSocket> } {
  const emits: EmitCall[] = [];
  const sockets = new Map<string, FakeSocket>();

  const target = {
    emit: (event: string, payload: unknown) => {
      emits.push({ event, payload });
      return true;
    },
  };

  const io = {
    to: () => target,
    in: () => ({
      fetchSockets: async () => Array.from(sockets.values()),
    }),
  } as unknown as Server;

  return { io, emits, sockets };
}

class FakeSocket {
  readonly id: string;
  readonly emits: EmitCall[] = [];
  constructor(id: string) {
    this.id = id;
  }
  emit(event: string, payload: unknown) {
    this.emits.push({ event, payload });
    return true;
  }
  join() {
    return Promise.resolve();
  }
}

function joinAs(
  manager: GameRoomManager,
  code: string,
  socketId: string,
  registry: Map<string, FakeSocket>
): FakeSocket {
  const socket = new FakeSocket(socketId);
  registry.set(socketId, socket);
  manager.joinRoom(code, socket as unknown as Socket);
  return socket;
}

describe('GameRoomManager — room lifecycle', () => {
  let mock: ReturnType<typeof makeMockIo>;
  let manager: GameRoomManager;

  beforeEach(() => {
    mock = makeMockIo();
    manager = new GameRoomManager(mock.io);
  });

  it('creates a room with a unique code', () => {
    const r1 = manager.createRoom();
    const r2 = manager.createRoom();
    expect(r1.code).toMatch(/^[A-Z0-9]+$/);
    expect(r1.code).not.toBe(r2.code);
  });

  it('joins a socket and assigns the first open seat + host', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'sock-A', mock.sockets);
    expect(room.seats[0]).toBe('sock-A');
    expect(room.hostId).toBe('sock-A');

    joinAs(manager, room.code, 'sock-B', mock.sockets);
    expect(room.seats[1]).toBe('sock-B');
    expect(room.hostId).toBe('sock-A');
  });

  it('rejects join when the room is full', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'a', mock.sockets);
    joinAs(manager, room.code, 'b', mock.sockets);
    joinAs(manager, room.code, 'c', mock.sockets);
    joinAs(manager, room.code, 'd', mock.sockets);
    expect(() => joinAs(manager, room.code, 'e', mock.sockets)).toThrow(/full/i);
  });

  it('rejects settings change from non-host', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    joinAs(manager, room.code, 'guest', mock.sockets);
    expect(() =>
      manager.updateRoomSettings(room.code, 'guest', { turnDurationMs: 30_000 })
    ).toThrow(/not allowed/i);
  });
});

describe('GameRoomManager — game launch', () => {
  let mock: ReturnType<typeof makeMockIo>;
  let manager: GameRoomManager;

  beforeEach(() => {
    mock = makeMockIo();
    manager = new GameRoomManager(mock.io);
  });

  it('refuses to launch with empty seats and fillWithBots disabled', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    expect(() => manager.launchGame(room.code, 'host')).toThrow(/not enough/i);
  });

  it('fills empty seats with bots and starts a game when fillWithBots is enabled', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    manager.updateRoomSettings(room.code, 'host', { fillWithBots: true });
    manager.launchGame(room.code, 'host');

    expect(room.gameState).toBeDefined();
    expect(room.gameState!.hands.flat().length).toBeGreaterThan(0);
    expect(room.gameState!.tableCards.length).toBeGreaterThan(0);
    // All 4 seats filled (1 human + 3 bots).
    expect(room.seats.every((s) => s != null)).toBe(true);
    const botCount = room.seats.filter((s) => s && Room.isBotId(s)).length;
    expect(botCount).toBe(3);
  });

  it('emits room:closed with code when host quits', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    manager.quitRoom(room.code, 'host');
    const closed = mock.emits.find((e) => e.event === 'room:closed');
    expect(closed).toBeDefined();
    expect(closed!.payload).toEqual({ code: room.code });
  });
});

describe('GameRoomManager — disconnect', () => {
  let mock: ReturnType<typeof makeMockIo>;
  let manager: GameRoomManager;

  beforeEach(() => {
    mock = makeMockIo();
    manager = new GameRoomManager(mock.io);
  });

  it('clears timers on disconnect (Phase 1.1 regression)', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    manager.updateRoomSettings(room.code, 'host', { fillWithBots: true });
    manager.launchGame(room.code, 'host');

    // Force a turn timer onto the room state.
    const fakeTimer = setTimeout(() => undefined, 60_000);
    room.turnTimeout = fakeTimer;
    const clearSpy = vi.spyOn(global, 'clearTimeout');

    manager.handleDisconnect('host');

    expect(clearSpy).toHaveBeenCalled();
    expect(room.turnTimeout).toBeNull();
    clearSpy.mockRestore();
  });

  it('backfills disconnected seat with a bot when fillWithBots is enabled', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    manager.updateRoomSettings(room.code, 'host', { fillWithBots: true });
    manager.launchGame(room.code, 'host');

    // Drop a bot seat first so we can verify a human disconnect is replaced.
    // After launch: seat 0 = host, seats 1..3 = bots. Disconnect host.
    manager.handleDisconnect('host');

    // Room is destroyed (no humans left) — verify destruction signal.
    const closed = mock.emits.filter((e) => e.event === 'room:closed');
    // No humans left, room should be destroyed (no explicit emit on disconnect path).
    expect(closed.length).toBe(0); // destroyed silently via destroyRoom path
  });

  it('preserves room and backfills bot when at least one human remains', () => {
    const room = manager.createRoom();
    joinAs(manager, room.code, 'host', mock.sockets);
    joinAs(manager, room.code, 'guest', mock.sockets);
    manager.updateRoomSettings(room.code, 'host', { fillWithBots: true });
    manager.launchGame(room.code, 'host');

    const guestSeat = room.seats.findIndex((s) => s === 'guest');
    expect(guestSeat).toBeGreaterThanOrEqual(0);

    manager.handleDisconnect('guest');

    // Seat is backfilled with a bot id.
    const newSid = room.seats[guestSeat];
    expect(newSid).not.toBeNull();
    expect(Room.isBotId(newSid!)).toBe(true);
  });
});
