import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameRoomManager } from './game/gameRoom';
import { RateLimiter } from './lib/rateLimit';
import { bindSocket } from './lib/socketHandlers';

const IS_DEV = process.env.NODE_ENV !== 'production';
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || (IS_DEV ? '*' : 'https://chkobagame.xyz');

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const rl = new RateLimiter();

app.get('/ads.txt', (_req, res) => {
  res
    .type('text/plain')
    .send('google.com, pub-9124857144736473, DIRECT, f08c47fec0942fa0\n');
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\n');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN } });
const manager = new GameRoomManager(io);

app.post('/api/rooms', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!rl.allow(`createRoom:${ip}`, 60_000, 10)) {
    res.status(429).json({ error: 'Too many rooms created. Try again later.' });
    return;
  }
  const room = manager.createRoom();
  res.json({ code: room.code });
});

io.on('connection', (socket) => bindSocket(io, socket, manager, rl));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
