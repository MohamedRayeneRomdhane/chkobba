import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameRoomManager } from './game/gameRoom';
import type { PlayerProfile, RoomSettings } from '../../shared/types';

// ─── CORS ───
const IS_DEV = process.env.NODE_ENV !== 'production';
const CORS_ORIGIN = process.env.CORS_ORIGIN
  || (IS_DEV ? '*' : 'https://chkobagame.xyz');

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// ─── Simple in-memory rate limiter ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, windowMs: number, maxHits: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxHits;
}

// Periodically prune expired rate-limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000).unref();

// Ensure ads.txt is reachable at the site root for ad network crawlers.
app.get('/ads.txt', (_req, res) => {
  res.type('text/plain').send('google.com, pub-9124857144736473, DIRECT, f08c47fec0942fa0\n');
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\n');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN } });
const manager = new GameRoomManager(io);

app.post('/api/rooms', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!rateLimit(`createRoom:${ip}`, 60_000, 10)) {
    res.status(429).json({ error: 'Too many rooms created. Try again later.' });
    return;
  }
  const room = manager.createRoom();
  res.json({ code: room.code });
});

io.on('connection', (socket) => {
  console.log(`[socket] connected ${socket.id}`);
  socket.on('room:join', (code: string, ack?: (_ok: boolean, _msg?: string) => void) => {
    try {
      console.log(`[room:join] ${socket.id} -> ${code}`);
      // socket.join is now handled inside manager.joinRoom after validation
      const room = manager.joinRoom(code, socket);
      ack?.(true, room.code);
    } catch (e: unknown) {
      console.error(`[room:join:error] ${socket.id} -> ${code}`, e);
      ack?.(false, (e as Error)?.message || 'join failed');
    }
  });

  socket.on(
    'room:settings',
    (
      payload: { code: string; settings: Partial<RoomSettings> },
      ack?: (_ok: boolean, _msg?: string) => void
    ) => {
      try {
        manager.updateRoomSettings(payload.code, socket.id, payload.settings);
        ack?.(true);
      } catch (e: unknown) {
        ack?.(false, (e as Error)?.message || 'settings failed');
      }
    }
  );

  socket.on(
    'game:launch',
    (payload: { code: string }, ack?: (_ok: boolean, _msg?: string) => void) => {
      try {
        manager.launchGame(payload.code, socket.id);
        ack?.(true);
      } catch (e: unknown) {
        ack?.(false, (e as Error)?.message || 'launch failed');
      }
    }
  );

  // Allow client to set profile (nickname/avatar); if missing, server uses defaults
  socket.on(
    'profile:set',
    (payload: Partial<PlayerProfile>, ack?: (_ok: boolean, _msg?: string) => void) => {
      try {
        console.log(`[profile:set] ${socket.id}`, payload);
        manager.setProfile(socket.id, payload);
        ack?.(true);
      } catch (e: unknown) {
        console.error(`[profile:set:error] ${socket.id}`, e);
        ack?.(false, (e as Error)?.message || 'profile failed');
      }
    }
  );

  socket.on(
    'game:play',
    (
      payload: { code: string; cardId: string; combo?: string[] },
      ack?: (_ok: boolean, _msg?: string) => void
    ) => {
      try {
        console.log(
          `[game:play] ${socket.id} code=${payload.code} card=${payload.cardId} combo=${payload.combo?.join(',') ?? '-'}`
        );
        manager.handlePlay(payload.code, socket.id, payload.cardId, payload.combo);
        ack?.(true);
      } catch (e: unknown) {
        console.error(`[game:play:error] ${socket.id} code=${payload.code}`, e);
        ack?.(false, (e as Error)?.message || 'play failed');
      }
    }
  );

  socket.on(
    'game:replay',
    (payload: { code: string }, ack?: (_ok: boolean, _msg?: string) => void) => {
      try {
        console.log(`[game:replay] ${socket.id} code=${payload.code}`);
        manager.requestReplay(payload.code, socket.id);
        ack?.(true);
      } catch (e: unknown) {
        console.error(`[game:replay:error] ${socket.id} code=${payload.code}`, e);
        ack?.(false, (e as Error)?.message || 'replay failed');
      }
    }
  );

  socket.on(
    'team:rename',
    (
      payload: { code: string; teamIndex: 0 | 1; name: string },
      ack?: (_ok: boolean, _msg?: string) => void
    ) => {
      try {
        manager.renameTeam(payload.code, socket.id, payload.teamIndex, payload.name);
        ack?.(true);
      } catch (e: unknown) {
        ack?.(false, (e as Error)?.message || 'rename failed');
      }
    }
  );

  socket.on(
    'game:soundboard',
    (payload: { code: string; soundFile: string }, ack?: (_ok: boolean, _msg?: string) => void) => {
      try {
        // Rate limit soundboard: 5 per 10s per socket
        if (!rateLimit(`soundboard:${socket.id}`, 10_000, 5)) {
          ack?.(false, 'Too many sounds. Slow down.');
          return;
        }
        manager.playSoundboard(payload.code, socket.id, payload.soundFile);
        ack?.(true);
      } catch (e: unknown) {
        ack?.(false, (e as Error)?.message || 'soundboard failed');
      }
    }
  );

  socket.on(
    'room:quit',
    (payload: { code: string }, ack?: (_ok: boolean, _msg?: string) => void) => {
      try {
        console.log(`[room:quit] ${socket.id} code=${payload.code}`);
        manager.quitRoom(payload.code, socket.id);
        ack?.(true);
      } catch (e: unknown) {
        console.error(`[room:quit:error] ${socket.id} code=${payload.code}`, e);
        ack?.(false, (e as Error)?.message || 'quit failed');
      }
    }
  );

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected ${socket.id} reason=${reason}`);
    try {
      manager.handleDisconnect(socket.id);
    } catch (e: unknown) {
      console.error(`[disconnect:manager:error] ${socket.id}`, e);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
