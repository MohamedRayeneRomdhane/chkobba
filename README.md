# Chkobba Web (4‑player 2v2)

Online Chkobba with a Tunisian café table vibe. Monorepo with a React client, a Socket.IO game server, shared TS types, and Playwright E2E tests.

## Stack
- Client: React + TypeScript + Vite + Tailwind
- Realtime: Socket.IO
- Server: Node.js + Express
- E2E: Playwright (`e2e/`)

## Repo Layout
- `client/` – UI + animations + sounds
- `server/` – game rules/validation + room management
- `shared/` – shared types
- `e2e/` – Playwright tests

## Run Locally
```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

Open the client in 4 tabs:
1) Create a room in the first tab
2) Join with the room code from the other tabs

## Configuration
- Client server URL: set `VITE_SERVER_URL` to point the client at a custom server (defaults to `http://localhost:3001` in dev).
- Server CORS: set `CORS_ORIGIN` (optional) to your deployed client origin.

## Current Features
- Rooms: create/join, seat assignment (0..3), 2v2 teams (0+2 vs 1+3)
- Core flow: dealing, turns, table selection + capturing/placing rules, basic scoring
- UI: table mat + hands/opponents, end overlay
- Profile: nickname + avatar editing (client-side)
- Soundboard: playing a sound triggers a sound-reactive spike/equalizer animation on the player’s seat that everyone in the room can see
- Café props + smoke/animations (including R3F/Three experiments)

## Soundboard Notes
- The server broadcasts `game:soundboard` with the triggering `seatIndex` so all clients render the seat animation in sync.
- The local client plays audio immediately on click (gesture-safe) and suppresses the server echo to avoid double playback.
- If you mute a seat’s soundboard on your client, you also won’t see that seat’s soundboard animation.
- Some browsers may not support `HTMLMediaElement.captureStream()` for analysis; in that case the UI falls back to a synthetic spike pattern while still showing who is “speaking”.

## Scripts
From repo root:
```bash
npm run dev
npm run dev:client
npm run dev:server
npm run dev:e2e
npm run build
npm run build:client
npm run build:server
npm run start:server
npm run e2e:install
npm run test:e2e
npm run test:e2e:headed
```

## Deployment
See `DEPLOY.md`.

## License
AGPL-3.0
