import type { Server, Socket } from 'socket.io';
import { GameRoomManager } from '../game/gameRoom';
import { RateLimiter } from './rateLimit';
import {
  GameLaunchSchema,
  GamePlaySchema,
  GameReplaySchema,
  ProfileSetSchema,
  RoomJoinSchema,
  RoomQuitSchema,
  RoomSettingsSchema,
  SoundboardSchema,
  TeamRenameSchema,
  parseOrAck,
  type AckFn,
} from './validation';

type WrapOpts = { logTag: string };

function wrap(fn: () => void, ack: AckFn | undefined, opts: WrapOpts) {
  try {
    fn();
    ack?.(true);
  } catch (e: unknown) {
    const msg = (e as Error)?.message || `${opts.logTag} failed`;
    console.error(`[${opts.logTag}:error]`, e);
    ack?.(false, msg);
  }
}

export function bindSocket(
  io: Server,
  socket: Socket,
  manager: GameRoomManager,
  rl: RateLimiter
): void {
  console.log(`[socket] connected ${socket.id}`);

  socket.on('room:join', (raw: unknown, ack?: AckFn) => {
    const code = parseOrAck(RoomJoinSchema, raw, ack);
    if (!code) return;
    try {
      console.log(`[room:join] ${socket.id} -> ${code}`);
      const room = manager.joinRoom(code, socket);
      ack?.(true, room.code);
    } catch (e: unknown) {
      console.error(`[room:join:error] ${socket.id} -> ${code}`, e);
      ack?.(false, (e as Error)?.message || 'join failed');
    }
  });

  socket.on('room:settings', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(RoomSettingsSchema, raw, ack);
    if (!p) return;
    wrap(() => manager.updateRoomSettings(p.code, socket.id, p.settings), ack, {
      logTag: 'room:settings',
    });
  });

  socket.on('game:launch', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(GameLaunchSchema, raw, ack);
    if (!p) return;
    wrap(() => manager.launchGame(p.code, socket.id), ack, {
      logTag: 'game:launch',
    });
  });

  socket.on('profile:set', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(ProfileSetSchema, raw, ack);
    if (!p) return;
    wrap(() => manager.setProfile(socket.id, p), ack, { logTag: 'profile:set' });
  });

  socket.on('game:play', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(GamePlaySchema, raw, ack);
    if (!p) return;
    console.log(
      `[game:play] ${socket.id} code=${p.code} card=${p.cardId} combo=${p.combo?.join(',') ?? '-'}`
    );
    wrap(() => manager.handlePlay(p.code, socket.id, p.cardId, p.combo), ack, {
      logTag: 'game:play',
    });
  });

  socket.on('game:replay', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(GameReplaySchema, raw, ack);
    if (!p) return;
    wrap(() => manager.requestReplay(p.code, socket.id), ack, {
      logTag: 'game:replay',
    });
  });

  socket.on('team:rename', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(TeamRenameSchema, raw, ack);
    if (!p) return;
    wrap(() => manager.renameTeam(p.code, socket.id, p.teamIndex, p.name), ack, {
      logTag: 'team:rename',
    });
  });

  socket.on('game:soundboard', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(SoundboardSchema, raw, ack);
    if (!p) return;
    if (!rl.allow(`soundboard:${socket.id}`, 10_000, 5)) {
      ack?.(false, 'Too many sounds. Slow down.');
      return;
    }
    wrap(() => manager.playSoundboard(p.code, socket.id, p.soundFile), ack, {
      logTag: 'game:soundboard',
    });
  });

  socket.on('room:quit', (raw: unknown, ack?: AckFn) => {
    const p = parseOrAck(RoomQuitSchema, raw, ack);
    if (!p) return;
    wrap(() => manager.quitRoom(p.code, socket.id), ack, {
      logTag: 'room:quit',
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected ${socket.id} reason=${reason}`);
    try {
      manager.handleDisconnect(socket.id);
    } catch (e: unknown) {
      console.error(`[disconnect:manager:error] ${socket.id}`, e);
    }
  });

  // Reserved: io is available for future broadcast handlers per-socket.
  void io;
}
