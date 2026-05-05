# Chkobba Web (4‑player 2v2)

Online Chkobba with a Tunisian café table vibe. Monorepo with a React client, a Socket.IO game server, shared TS types, and Playwright E2E tests.

## Stack
- Client: React + TypeScript + Vite + Tailwind + Zustand
- Realtime: Socket.IO (typed event maps)
- Server: Node.js + Express + Zod validation
- E2E: Playwright (`e2e/`)

## Repo Layout
```
client/
  src/
    animations/       # useFlightChoreographer, geometry helpers
    features/         # game/, room/, ui/ feature components
    net/              # socketClient (singleton), useGameNetwork hook
    store/            # Zustand slices: connection, room, game, ui, audio
    test/             # vitest setup
server/
  src/
    game/             # rules, scoring
    lib/              # validation (Zod), rateLimit, socketHandlers
shared/
  events.ts           # ServerToClient / ClientToServer typed event maps
  types.ts            # Card, Player, GameState …
e2e/                  # Playwright tests
```

## Architecture

### State (client)
Single Zustand store with 5 typed slices. All components subscribe via fine-grained selectors using `useShallow` to avoid spurious re-renders.

```
useConnection  →  { status, socketId }
useRoom        →  { code, seats, settings, phase }
useGame        →  { table, hands, scores, lastPlay, … }
useSelection   →  { handCard, tableCards, sum, canPlay }
useAudio       →  { muted }
```

`GamePhase` state machine: `'idle' → 'lobby' → 'playing' → 'roundEnd' → 'lobby'`

### Network (client)
`socketClient.ts` — typed singleton socket with exponential reconnect backoff.  
`useGameNetwork.ts` — binds all socket events to Zustand; handles room resync on reconnect. Exposes: `createRoom`, `join`, `play`, `updateRoomSettings`, `launchGame`, `setProfile`, `replay`, `playSoundboard`, `renameTeam`, `quit`.

### Animations
`useFlightChoreographer` drives card-flight animations entirely from `lastPlay.t` (server timestamp). Single `useLayoutEffect` snapshots DOM rects from the *previous* render before React commits new state (FLIP technique), then schedules Web Animations API keyframes. No `visibility:hidden` hacks, no stacking `setTimeout` watchdogs, no hand-diffing.

### Validation (server)
All inbound socket payloads pass through Zod schemas before touching game state. `parseOrAck` auto-acks with an error message on parse failure so the client always gets a response. Per-event rate limiting via `RateLimiter`.

### Build
Vite manual chunk splitting: `react-vendor`, `socket-vendor`, `three-vendor` (R3F/Three.js lazy-loaded). Vitest uses a separate `vitest.config.ts` (avoids `Plugin<any>` type conflict with vitest's bundled Vite copy).

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

## Tests
```bash
# server unit tests (26 tests)
cd server && npm test

# client unit tests
cd client && npm test

# E2E
npm run test:e2e
```

Covered: Zod schemas, `parseOrAck`, `RateLimiter`, `computeRoundScore`, geometry helpers, Zustand store slices.

## Configuration
- Client server URL: set `VITE_SERVER_URL` to point the client at a custom server (defaults to `http://localhost:3001` in dev).
- Server CORS: set `CORS_ORIGIN` (optional) to your deployed client origin.

## Current Features
- Rooms: create/join, seat assignment (0..3), 2v2 teams (0+2 vs 1+3)
- Core flow: dealing, turns, table selection + capturing/placing rules, scoring (most cards, 7s, 7♦, chkobba bonus)
- UI: table mat + hands/opponents, end overlay
- Profile: nickname + avatar editing (client-side)
- Soundboard: playing a sound triggers a sound-reactive spike/equalizer animation on the player's seat that everyone in the room can see
- Café props + smoke/animations (R3F/Three.js, lazy-loaded)

## Soundboard Notes
- Server broadcasts `game:soundboard` with the triggering `seatIndex` so all clients render the seat animation in sync.
- Local client plays audio immediately on click (gesture-safe) and suppresses the server echo to avoid double playback.
- If you mute a seat's soundboard on your client, you also won't see that seat's soundboard animation.
- Some browsers may not support `HTMLMediaElement.captureStream()` for analysis; in that case the UI falls back to a synthetic spike pattern while still showing who is "speaking".

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
