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

## Current Features
- Rooms: create/join, seat assignment (0..3), 2v2 teams (0+2 vs 1+3)
- Core flow: dealing, turns, table selection + capturing/placing rules, basic scoring
- UI: table mat + hands/opponents, end overlay
- Profile: nickname + avatar editing (client-side)
- Café props + smoke/animations (including R3F/Three experiments)

## Scripts
From repo root:
```bash
npm run dev
npm run build
npm run test:e2e
npm run test:e2e:headed
```

## Deployment
See `DEPLOY.md`.

## License
AGPL-3.0
