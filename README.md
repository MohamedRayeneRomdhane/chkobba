# Chkobba Web (4-player 2v2)

A minimal foundation for a 4-player online Chkobba game (teams: 0+2 vs 1+3) with a Tunisian café table feel.

- Frontend: React + TypeScript + Vite
- Server: Node.js + Express + Socket.io
- Shared types: `shared/`
- Rendering: HTML/CSS + simple card divs (SVG-ready)
- License: AGPL-3.0

## Dev Setup

```bash
# from chkobba-web/
npm install            # installs server, client, shared via workspaces
npm run dev            # starts server (3001) and client (5173)
```

Open http://localhost:5173 in 4 browser tabs.

- Click "Create & Join" in the first tab to create a room.
- Copy the room code and "Join" from the other tabs.
- When 4 sockets join, seats are auto-assigned (0..3) and the game starts.

## Gameplay Implemented
- Deck: 40 cards; ranks A, 2–7, Q, J, K.
- Dealing: 3 cards to each player, 4 cards to table.
- Moves: single-card capture has priority over combinations; otherwise the card is placed on the table.
- Chkobba: counts when table is cleared. Dealer last-card chkobba restriction is to be enforced in later deal-phase logic extension.
- Scoring: basic round scoring function exists in server `scoring.ts`.

## Visual Table & Props
- Center green felt `TableMat` with wooden border.
- Bottom: local player's hand fanned.
- Top/Left/Right: opponent placeholders (card backs).
- Props: Coffee, Chicha, Cigarettes components with hover & click glow and console logs.

## Notes
- Client performs rendering and sends moves; server validates and updates `GameState`.
- This foundation focuses on room management, turn flow, and UI scaffolding; no AI or persistence yet.
