import { Server, Socket } from "socket.io";
import { Card, GameState, PlayerIndex, RoomInfo, TEAM_FOR_SEAT, TeamIndex, PlayerProfile, RoomSnapshot } from "../../../shared/types";
import { createDeck, shuffle } from "./deck";
import { applyMove } from "./rules";
import { computeRoundScore } from "./scoring";

export class GameRoomManager {
  rooms: Map<string, RoomInfo> = new Map();
  // keep per-room deck state and dealer info
  private roomDecks: Map<string, Card[]> = new Map();
  private roomDealerIndex: Map<string, PlayerIndex> = new Map();
  private cardsLeftInCurrentDeal: Map<string, number> = new Map(); // counts down per player turns in a 3-card deal
  private profiles: Map<string, PlayerProfile> = new Map(); // key: socketId
  private avatarPool: string[] = [
    "/assets/avatars/avatar1.png",
    "/assets/avatars/avatar2.png",
    "/assets/avatars/avatar3.png",
    "/assets/avatars/avatar4.png"
  ];

  constructor(private io: Server) {}

  createRoom(): RoomInfo {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const room: RoomInfo = {
      code,
      players: [],
      seats: [null, null, null, null],
      teams: [[0, 2], [1, 3]],
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, socket: Socket): RoomInfo {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.players.includes(socket.id)) return room;
    if (room.players.length >= 4) throw new Error("Room full");
    room.players.push(socket.id);
    this.io.socketsJoin(code);

    // ensure profile exists with defaults
    if (!this.profiles.has(socket.id)) {
      const nickname = this.generateReadableName();
      const avatar = this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] || "/assets/avatars/default.png";
      this.profiles.set(socket.id, { socketId: socket.id, nickname, avatar });
    }

    // assign seat when 4 joined
    if (room.players.length === 4) {
      room.seats = [...room.players];
      this.startGame(room);
    }
    this.emitRoomSnapshot(code);
    return room;
  }

  private dealInitial(): GameState {
    const deck = shuffle(createDeck());
    const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const tableCards: Card[] = [];

    // deal 3 cards to each player
    for (let r = 0; r < 3; r++) {
      for (let p = 0; p < 4; p++) {
        const c = deck.shift();
        if (!c) throw new Error("Deck exhausted early");
        hands[p].push(c);
      }
    }

    // 4 cards to table
    for (let i = 0; i < 4; i++) {
      const c = deck.shift();
      if (!c) throw new Error("Deck exhausted early");
      tableCards.push(c);
    }

    return {
      tableCards,
      hands,
      capturesByTeam: [[], []],
      scoresByTeam: [0, 0],
      currentPlayerIndex: 0,
      roundNumber: 1,
      chkobbaByTeam: [0, 0],
    };
  }

  private startGame(room: RoomInfo) {
    const gs = this.dealInitial();
    room.gameState = gs;
    // initialize deck and dealer state tracking
    const deck = shuffle(createDeck());
    // remove the cards already dealt (3*4 + 4 table = 16)
    deck.splice(0, 16);
    this.roomDecks.set(room.code, deck);
    // dealer is player 0 at initial deal
    this.roomDealerIndex.set(room.code, 0);
    // 3 cards per player in a deal => 12 total turns per deal
    this.cardsLeftInCurrentDeal.set(room.code, 12);
    this.io.to(room.code).emit("game:start", room.gameState);
    this.emitRoomSnapshot(room.code);
  }

  handlePlay(code: string, socketId: string, playedCardId: string, combo?: string[]) {
    const room = this.rooms.get(code);
    if (!room || !room.gameState) throw new Error("Room not ready");
    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex !== room.gameState.currentPlayerIndex) throw new Error("Not your turn");

    const res = applyMove(room.gameState, seatIndex, playedCardId, combo);

    // update server state
    room.gameState.tableCards = res.newTable;
    room.gameState.hands[seatIndex] = res.newHand;
    if (res.captured.length > 0) {
      const team = TEAM_FOR_SEAT[seatIndex];
      room.gameState.capturesByTeam[team].push(...res.captured);
      // enforce dealer cannot score chkobba on the very last card of the deal
      const turnsLeft = this.cardsLeftInCurrentDeal.get(code) ?? 0;
      const dealer = this.roomDealerIndex.get(code) ?? 0;
      const isLastCardOfDeal = turnsLeft === 1;
      if (res.chkobba) {
        const isDealerTurn = seatIndex === dealer;
        if (!(isDealerTurn && isLastCardOfDeal)) {
          room.gameState.chkobbaByTeam[team] += 1;
        }
      }
    }
    room.gameState.currentPlayerIndex = res.nextPlayer;
    room.gameState.lastCaptureTeam = res.lastCaptureTeam;

    // decrement turns left in current deal for each play
    const remaining = (this.cardsLeftInCurrentDeal.get(code) ?? 0) - 1;
    this.cardsLeftInCurrentDeal.set(code, remaining);

    // if all 12 turns of the deal are done, attempt next deal
    if (remaining <= 0) {
      this.nextDealOrEndRound(code, room);
    }

    this.io.to(code).emit("game:update", room.gameState);
    this.emitRoomSnapshot(code);
  }

  private nextDealOrEndRound(code: string, room: RoomInfo) {
    const deck = this.roomDecks.get(code) || [];
    // if deck still has cards, deal next 3 cards to each player
    if (deck.length >= 12) {
      for (let r = 0; r < 3; r++) {
        for (let p = 0; p < 4; p++) {
          const c = deck.shift();
          if (!c) break;
          room.gameState!.hands[p].push(c);
        }
      }
      // reset turns left for new deal
      this.cardsLeftInCurrentDeal.set(code, 12);
      // dealer rotates: next dealer is (prev dealer + 1) % 4
      const prevDealer = this.roomDealerIndex.get(code) ?? 0;
      const nextDealer = ((prevDealer + 1) % 4) as PlayerIndex;
      this.roomDealerIndex.set(code, nextDealer);
    } else {
      // End of round: sweep any remaining table cards to lastCaptureTeam (no chkobba)
      const lastTeam = room.gameState!.lastCaptureTeam;
      if (lastTeam !== undefined && room.gameState!.tableCards.length > 0) {
        room.gameState!.capturesByTeam[lastTeam].push(...room.gameState!.tableCards);
        room.gameState!.tableCards = [];
      }
      // Compute scoring
      const roundScore = computeRoundScore(room.gameState!.capturesByTeam, room.gameState!.chkobbaByTeam);
      room.gameState!.scoresByTeam = [
        room.gameState!.scoresByTeam[0] + roundScore.teamPoints[0],
        room.gameState!.scoresByTeam[1] + roundScore.teamPoints[1],
      ];
      // broadcast end of round and reset for next round
      this.io.to(code).emit("game:roundEnd", {
        scores: room.gameState!.scoresByTeam,
        details: roundScore.details,
      });
      // Prepare next round: new deck, clear captures/chkobba, deal initial
      const newDeck = shuffle(createDeck());
      const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
      const tableCards: Card[] = [];
      for (let r = 0; r < 3; r++) {
        for (let p = 0; p < 4; p++) {
          const c = newDeck.shift();
          if (!c) throw new Error("Deck exhausted early");
          hands[p].push(c);
        }
      }
      for (let i = 0; i < 4; i++) {
        const c = newDeck.shift();
        if (!c) throw new Error("Deck exhausted early");
        tableCards.push(c);
      }
      room.gameState = {
        tableCards,
        hands,
        capturesByTeam: [[], []],
        scoresByTeam: room.gameState!.scoresByTeam, // carry forward total scores
        currentPlayerIndex: 0,
        roundNumber: room.gameState!.roundNumber + 1,
        chkobbaByTeam: [0, 0],
      };
      // setup deck and dealer for new round
      const remainingDeck = newDeck; // after initial 16 dealt
      remainingDeck.splice(0, 0); // no-op to be explicit
      this.roomDecks.set(code, remainingDeck);
      this.roomDealerIndex.set(code, 0);
      this.cardsLeftInCurrentDeal.set(code, 12);
      this.io.to(code).emit("game:start", room.gameState);
      this.emitRoomSnapshot(code);
    }
  }

  setProfile(socketId: string, payload: Partial<PlayerProfile>) {
    const current = this.profiles.get(socketId) || { socketId, nickname: this.generateReadableName(), avatar: "/assets/avatars/default.png" };
    const nickname = (payload.nickname && payload.nickname.trim()) || current.nickname || this.generateReadableName();
    const avatar = payload.avatar || current.avatar || "/assets/avatars/default.png";
    this.profiles.set(socketId, { socketId, nickname, avatar });
    // find rooms this socket is part of and emit snapshot
    for (const [code, room] of this.rooms) {
      if (room.players.includes(socketId)) {
        this.emitRoomSnapshot(code);
      }
    }
  }

  private emitRoomSnapshot(code: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    const profiles: Record<string, PlayerProfile> = {};
    for (const sid of room.players) {
      const p = this.profiles.get(sid);
      if (p) profiles[sid] = p;
    }
    const snapshot: RoomSnapshot = { ...room, profiles };
    this.io.to(code).emit("room:snapshot", snapshot);
  }

  private generateReadableName(): string {
    const adjectives = ["Calm", "Bright", "Swift", "Lucky", "Sunny", "Cozy", "Merry", "Brave"];
    const nouns = ["Falcon", "Olive", "Cedar", "Caravan", "Harbor", "Atlas", "Nomad", "Sahara"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
}
