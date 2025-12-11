import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { GameRoomManager } from "./game/gameRoom";
import type { PlayerProfile } from "../../shared/types";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const manager = new GameRoomManager(io);

app.post("/api/rooms", (req, res) => {
  const room = manager.createRoom();
  res.json({ code: room.code });
});

io.on("connection", (socket) => {
  console.log(`[socket] connected ${socket.id}`);
  socket.on("room:join", (code: string, ack?: (ok: boolean, msg?: string) => void) => {
    try {
      console.log(`[room:join] ${socket.id} -> ${code}`);
      const room = manager.joinRoom(code, socket);
      socket.join(code);
      ack?.(true, room.code);
    } catch (e: any) {
      console.error(`[room:join:error] ${socket.id} -> ${code}`, e);
      ack?.(false, e?.message || "join failed");
    }
  });

  // Allow client to set profile (nickname/avatar); if missing, server uses defaults
  socket.on("profile:set", (payload: Partial<PlayerProfile>, ack?: (ok: boolean, msg?: string) => void) => {
    try {
      console.log(`[profile:set] ${socket.id}`, payload);
      manager.setProfile(socket.id, payload);
      ack?.(true);
    } catch (e: any) {
      console.error(`[profile:set:error] ${socket.id}`, e);
      ack?.(false, e?.message || "profile failed");
    }
  });

  socket.on("game:play", (payload: { code: string; cardId: string; combo?: string[] }, ack?: (ok: boolean, msg?: string) => void) => {
    try {
      console.log(`[game:play] ${socket.id} code=${payload.code} card=${payload.cardId} combo=${payload.combo?.join(",") ?? "-"}`);
      manager.handlePlay(payload.code, socket.id, payload.cardId, payload.combo);
      ack?.(true);
    } catch (e: any) {
      console.error(`[game:play:error] ${socket.id} code=${payload.code}`, e);
      ack?.(false, e?.message || "play failed");
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected ${socket.id} reason=${reason}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
