import { Server, Socket } from 'socket.io';
import {
  Card,
  GameState,
  PlayerIndex,
  RoomInfo,
  TEAM_FOR_SEAT,
  PlayerProfile,
  RoomSnapshot,
} from '../../../shared/types';
import { createDeck, shuffle } from './deck';
import { applyMove } from './rules';
import { computeRoundScore } from './scoring';

export class GameRoomManager {
  rooms: Map<string, RoomInfo> = new Map();
  // keep per-room deck state and dealer info
  private roomDecks: Map<string, Card[]> = new Map();
  private roomDealerIndex: Map<string, PlayerIndex> = new Map();
  private cardsLeftInCurrentDeal: Map<string, number> = new Map(); // counts down per player turns in a 3-card deal
  private profiles: Map<string, PlayerProfile> = new Map(); // key: socketId
  private replayVotes: Map<string, Set<string>> = new Map(); // roomCode -> socketIds who clicked replay
  private avatarPool: string[] = [
    '/assets/avatars/avatar1.png',
    '/assets/avatars/avatar2.png',
    '/assets/avatars/avatar3.png',
    '/assets/avatars/avatar4.png',
  ];

  constructor(private readonly io: Server) {}

  createRoom(): RoomInfo {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    console.log(`[manager] createRoom ${code}`);
    const room: RoomInfo = {
      code,
      players: [],
      seats: [null, null, null, null],
      teams: [
        [0, 2],
        [1, 3],
      ],
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, socket: Socket): RoomInfo {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.players.includes(socket.id)) return room;
    if (room.players.length >= 4) throw new Error('Room full');
    room.players.push(socket.id);
    console.log(`[manager] joinRoom ${code} player=${socket.id} count=${room.players.length}`);
    // The socket joins the room in the HTTP/Socket handler; avoid joining all sockets globally here.

    // ensure profile exists with defaults
    if (!this.profiles.has(socket.id)) {
      const nickname = this.generateReadableName();
      const avatar =
        this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] ||
        '/assets/avatars/default.png';
      this.profiles.set(socket.id, { socketId: socket.id, nickname, avatar });
    }

    // assign seat when 4 joined
    if (room.players.length === 4) {
      room.seats = [...room.players];
      console.log(`[manager] seats filled for ${code} -> starting game`);
      this.startGame(room);
    }
    this.emitRoomSnapshot(code);
    return room;
  }

  private dealInitial(): { state: GameState; remainingDeck: Card[] } {
    const deck = shuffle(createDeck());
    const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const tableCards: Card[] = [];

    // deal 3 cards to each player
    for (let r = 0; r < 3; r++) {
      for (let p = 0; p < 4; p++) {
        const c = deck.shift();
        if (!c) throw new Error('Deck exhausted early');
        hands[p].push(c);
      }
    }

    // 4 cards to table
    for (let i = 0; i < 4; i++) {
      const c = deck.shift();
      if (!c) throw new Error('Deck exhausted early');
      tableCards.push(c);
    }

    const state: GameState = {
      tableCards,
      hands,
      capturesByTeam: [[], []],
      scoresByTeam: [0, 0],
      currentPlayerIndex: 0,
      roundNumber: 1,
      chkobbaByTeam: [0, 0],
    };
    return { state, remainingDeck: deck };
  }

  private startGame(room: RoomInfo) {
    console.log(`[manager] startGame room=${room.code}`);
    const initial = this.dealInitial();
    room.gameState = initial.state;
    // initialize deck and dealer state tracking using the remaining from initial shuffle
    // after dealInitial, deck already has the remaining cards beyond the initial 16
    this.roomDecks.set(room.code, initial.remainingDeck);
    // dealer is player 0 at initial deal
    this.roomDealerIndex.set(room.code, 0);
    // 3 cards per player in a deal => 12 total turns per deal
    this.cardsLeftInCurrentDeal.set(room.code, 12);
    this.io.to(room.code).emit('game:start', room.gameState);
    this.emitRoomSnapshot(room.code);
  }

  handlePlay(code: string, socketId: string, playedCardId: string, combo?: string[]) {
    const room = this.rooms.get(code);
    if (!room || !room.gameState) throw new Error('Room not ready');
    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex !== room.gameState.currentPlayerIndex) {
      console.warn(
        `[manager] Not your turn socket=${socketId} seat=${seatIndex} current=${room.gameState.currentPlayerIndex}`
      );
      throw new Error('Not your turn');
    }
    console.log(
      `[manager] handlePlay code=${code} seat=${seatIndex} card=${playedCardId} combo=${combo?.join(',') ?? '-'}`
    );

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
    console.log(
      `[manager] turn advanced next=${room.gameState.currentPlayerIndex} remainingInDeal=${remaining}`
    );

    // if all 12 turns of the deal are done, attempt next deal
    if (remaining <= 0) {
      console.log(`[manager] deal completed for room=${code}; proceeding next deal or end round`);
      this.nextDealOrEndRound(code, room);
    }

    this.io.to(code).emit('game:update', room.gameState);
    this.emitRoomSnapshot(code);
  }

  private nextDealOrEndRound(code: string, room: RoomInfo) {
    console.log(
      `[manager] nextDealOrEndRound room=${code} deckLeft=${(this.roomDecks.get(code) || []).length}`
    );
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
      console.log(`[manager] round end room=${code}`);
      // End of round: sweep any remaining table cards to lastCaptureTeam (no chkobba)
      const lastTeam = room.gameState!.lastCaptureTeam;
      if (lastTeam !== undefined && room.gameState!.tableCards.length > 0) {
        room.gameState!.capturesByTeam[lastTeam].push(...room.gameState!.tableCards);
        room.gameState!.tableCards = [];
      }
      // Compute scoring
      const roundScore = computeRoundScore(
        room.gameState!.capturesByTeam,
        room.gameState!.chkobbaByTeam
      );
      room.gameState!.scoresByTeam = [
        room.gameState!.scoresByTeam[0] + roundScore.teamPoints[0],
        room.gameState!.scoresByTeam[1] + roundScore.teamPoints[1],
      ];
      // broadcast end of round and initialize replay waiting state
      this.io.to(code).emit('game:roundEnd', {
        scores: room.gameState!.scoresByTeam,
        details: roundScore.details,
      });
      this.replayVotes.set(code, new Set());
      this.io.to(code).emit('game:replayStatus', { count: 0, total: room.players.length });
      // Prepare next round: new deck, clear captures/chkobba, deal initial
      const newDeck = shuffle(createDeck());
      const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
      const tableCards: Card[] = [];
      for (let r = 0; r < 3; r++) {
        for (let p = 0; p < 4; p++) {
          const c = newDeck.shift();
          if (!c) throw new Error('Deck exhausted early');
          hands[p].push(c);
        }
      }
      for (let i = 0; i < 4; i++) {
        const c = newDeck.shift();
        if (!c) throw new Error('Deck exhausted early');
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
      this.io.to(code).emit('game:start', room.gameState);
      this.emitRoomSnapshot(code);
    }
  }

  requestReplay(code: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    const votes = this.replayVotes.get(code) || new Set<string>();
    votes.add(socketId);
    this.replayVotes.set(code, votes);
    const count = votes.size;
    this.io.to(code).emit('game:replayStatus', { count, total: room.players.length });
    if (count >= room.players.length) {
      room.gameState = undefined;
      this.roomDecks.delete(code);
      this.roomDealerIndex.delete(code);
      this.cardsLeftInCurrentDeal.delete(code);
      this.replayVotes.delete(code);
      this.startGame(room);
    }
  }

  quitRoom(code: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    console.log(`[manager] quitRoom ${code} by ${socketId} -> discarding room`);
    this.io.to(code).emit('room:closed', { code });
    this.rooms.delete(code);
    this.roomDecks.delete(code);
    this.roomDealerIndex.delete(code);
    this.cardsLeftInCurrentDeal.delete(code);
    this.replayVotes.delete(code);
  }

  setProfile(socketId: string, payload: Partial<PlayerProfile>) {
    console.log(`[manager] setProfile ${socketId} ->`, payload);
    const current = this.profiles.get(socketId) || {
      socketId,
      nickname: this.generateReadableName(),
      avatar: '/assets/avatars/default.png',
    };
    const nickname =
      (payload.nickname && payload.nickname.trim()) ||
      current.nickname ||
      this.generateReadableName();
    const avatar = payload.avatar || current.avatar || '/assets/avatars/default.png';
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
    // avoid emitting before seats assigned on first joins
    const profiles: Record<string, PlayerProfile> = {};
    for (const sid of room.players) {
      const p = this.profiles.get(sid);
      if (p) profiles[sid] = p;
    }
    const snapshot: RoomSnapshot = { ...room, profiles };
    // Emit snapshot for all clients; also emit a legacy 'room:update' for compatibility
    this.io.to(code).emit('room:snapshot', snapshot);
    this.io.to(code).emit('room:update', snapshot);
  }

  private generateReadableName(): string {
    const adjectives = ['Calm', 'Bright', 'Swift', 'Lucky', 'Sunny', 'Cozy', 'Merry', 'Brave'];
    const nouns = ['Falcon', 'Olive', 'Cedar', 'Caravan', 'Harbor', 'Atlas', 'Nomad', 'Sahara'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
}
