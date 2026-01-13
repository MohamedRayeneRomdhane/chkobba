import { Server, Socket } from 'socket.io';
import {
  Card,
  GameState,
  PlayerIndex,
  RoomInfo,
  TEAM_FOR_SEAT,
  PlayerProfile,
  RoomSnapshot,
  TurnInfo,
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
  private pendingNextRound: Map<
    string,
    {
      gameState: GameState;
      remainingDeck: Card[];
      dealerIndex: PlayerIndex;
      cardsLeftInDeal: number;
    }
  > = new Map();
  private roomTurn: Map<string, TurnInfo> = new Map();
  private roomTurnTimeout: Map<string, NodeJS.Timeout> = new Map();
  private static readonly TURN_DURATION_MS = 60_000;
  private static readonly REPLAY_VOTES_REQUIRED = 4;
  private avatarPool: string[] = [
    '/assets/avatars/avatar1.png',
    '/assets/avatars/avatar2.png',
    '/assets/avatars/avatar3.png',
    '/assets/avatars/avatar4.png',
  ];

  constructor(private readonly io: Server) {}

  private static isAllowedSoundboardFile(soundFile: string) {
    // Prevent path traversal and limit to common audio extensions.
    // The server doesn't have a reliable list of client static assets in production.
    return /^[A-Za-z0-9][A-Za-z0-9 _.-]*\.(mp3|wav|ogg)$/i.test(soundFile);
  }

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
      teamNames: ['Team A', 'Team B'],
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, socket: Socket): RoomInfo {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.players.includes(socket.id)) return room;

    const existingSeat = room.seats.findIndex((s) => s === socket.id);
    if (existingSeat >= 0) return room;

    const openSeat = room.seats.findIndex((s) => s == null);
    // If no seats are open, disallow joining.
    if (openSeat < 0) throw new Error('Room full');

    room.players.push(socket.id);
    room.seats[openSeat] = socket.id;
    console.log(
      `[manager] joinRoom ${code} player=${socket.id} seat=${openSeat} count=${room.players.length}`
    );
    // The socket joins the room in the HTTP/Socket handler; avoid joining all sockets globally here.

    // ensure profile exists with defaults
    if (!this.profiles.has(socket.id)) {
      const nickname = this.generateReadableName();
      const avatar =
        this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] ||
        '/assets/avatars/default.png';
      this.profiles.set(socket.id, { socketId: socket.id, nickname, avatar });
    }

    // start a new game once all seats are filled (first time)
    if (!room.gameState && room.seats.every((s) => s != null)) {
      console.log(`[manager] seats filled for ${code} -> starting game`);
      this.startGame(room);
    }

    // If game already running, send the current state to the joining socket.
    if (room.gameState) {
      socket.emit('game:start', room.gameState);
      const turn = this.roomTurn.get(code);
      if (turn) {
        socket.emit('game:turnTimer', {
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          endsAt: turn.endsAt,
          durationMs: turn.durationMs,
          serverNow: Date.now(),
        });
      }
    }

    // If we are waiting for replay votes, send the current replay status to the joiner.
    const votes = this.replayVotes.get(code);
    if (votes) {
      socket.emit('game:replayStatus', {
        count: votes.size,
        total: GameRoomManager.REPLAY_VOTES_REQUIRED,
      });
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
    this.startTurnTimer(room.code, room);
    this.emitRoomSnapshot(room.code);
  }

  handleDisconnect(socketId: string) {
    for (const [code, room] of this.rooms) {
      if (!room.players.includes(socketId) && !room.seats.includes(socketId)) continue;

      room.players = room.players.filter((p) => p !== socketId);
      let vacatedSeat: PlayerIndex | null = null;
      for (let i = 0; i < room.seats.length; i++) {
        if (room.seats[i] === socketId) {
          room.seats[i] = null;
          vacatedSeat = i as PlayerIndex;
        }
      }

      // If we were waiting for replay, update total.
      const votes = this.replayVotes.get(code);
      if (votes) {
        votes.delete(socketId);
        this.io
          .to(code)
          .emit('game:replayStatus', {
            count: votes.size,
            total: GameRoomManager.REPLAY_VOTES_REQUIRED,
          });
      }

      this.emitRoomSnapshot(code);

      // If it's now a vacant seat's turn, auto-play immediately.
      if (room.gameState) {
        const cur = room.gameState.currentPlayerIndex;
        if (room.seats[cur] == null) {
          this.maybeAutoPlayVacantTurns(code, room);
        } else if (vacatedSeat != null && cur === vacatedSeat) {
          // Turn owner disconnected but seat is now empty
          this.maybeAutoPlayVacantTurns(code, room);
        }
      }
    }
  }

  private startTurnTimer(code: string, room: RoomInfo) {
    if (!room.gameState) return;

    const existing = this.roomTurnTimeout.get(code);
    if (existing) {
      clearTimeout(existing);
      this.roomTurnTimeout.delete(code);
    }

    const endsAt = Date.now() + GameRoomManager.TURN_DURATION_MS;
    const turn: TurnInfo = { endsAt, durationMs: GameRoomManager.TURN_DURATION_MS };
    this.roomTurn.set(code, turn);
    room.turn = turn;

    this.io.to(code).emit('game:turnTimer', {
      currentPlayerIndex: room.gameState.currentPlayerIndex,
      endsAt,
      durationMs: GameRoomManager.TURN_DURATION_MS,
      serverNow: Date.now(),
    });

    const expectedPlayer = room.gameState.currentPlayerIndex;
    const timeout = setTimeout(() => {
      this.handleTurnTimeout(code, expectedPlayer, endsAt);
    }, GameRoomManager.TURN_DURATION_MS + 50);
    this.roomTurnTimeout.set(code, timeout);
  }

  private clearTurnTimer(code: string, room?: RoomInfo) {
    const existing = this.roomTurnTimeout.get(code);
    if (existing) {
      clearTimeout(existing);
      this.roomTurnTimeout.delete(code);
    }
    this.roomTurn.delete(code);
    const r = room ?? this.rooms.get(code);
    if (r) {
      r.turn = undefined;
    }
  }

  private handleTurnTimeout(code: string, expectedPlayer: PlayerIndex, expectedEndsAt: number) {
    const room = this.rooms.get(code);
    if (!room?.gameState) return;

    const cur = room.gameState.currentPlayerIndex;
    const turn = this.roomTurn.get(code);
    if (!turn || turn.endsAt !== expectedEndsAt) return; // stale
    if (cur !== expectedPlayer) return; // already advanced

    const played = this.autoPlayRandom(code, room, cur, 'timeout');
    if (played) return;

    // Fallback: if we couldn't play (e.g., empty hand), force progress to avoid deadlock.
    const allEmpty = room.gameState.hands.every((h) => h.length === 0);
    if (allEmpty) {
      this.cardsLeftInCurrentDeal.set(code, 0);
      this.nextDealOrEndRound(code, room);
      this.io.to(code).emit('game:update', room.gameState);
    } else {
      room.gameState.currentPlayerIndex = ((cur + 1) % 4) as PlayerIndex;
      this.io.to(code).emit('game:update', room.gameState);
    }

    if (room.seats[room.gameState.currentPlayerIndex] == null) {
      this.maybeAutoPlayVacantTurns(code, room);
      return;
    }

    this.startTurnTimer(code, room);
    this.emitRoomSnapshot(code);
  }

  private maybeAutoPlayVacantTurns(code: string, room: RoomInfo) {
    if (!room.gameState) return;
    // Guard against runaway loops in corrupted states.
    for (let i = 0; i < 8; i++) {
      const cur = room.gameState.currentPlayerIndex;
      if (room.seats[cur] != null) {
        this.startTurnTimer(code, room);
        this.emitRoomSnapshot(code);
        return;
      }
      // Seat is empty; play a random card immediately.
      const hand = room.gameState.hands[cur];
      if (!hand || hand.length === 0) {
        // Can't play; just advance to avoid deadlock.
        room.gameState.currentPlayerIndex = ((cur + 1) % 4) as PlayerIndex;
        continue;
      }
      const played = this.autoPlayRandom(code, room, cur, 'vacant');
      if (!played) {
        room.gameState.currentPlayerIndex = ((cur + 1) % 4) as PlayerIndex;
        continue;
      }
      // autoPlayRandom emits update and advances turn; continue if next is also vacant.
    }
  }

  private autoPlayRandom(
    code: string,
    room: RoomInfo,
    seatIndex: PlayerIndex,
    reason: 'timeout' | 'vacant'
  ): boolean {
    if (!room.gameState) return false;
    const hand = room.gameState.hands[seatIndex];
    if (!hand || hand.length === 0) return false;

    const card = hand[Math.floor(Math.random() * hand.length)];
    if (!card) return false;

    console.log(`[manager] autoPlay (${reason}) code=${code} seat=${seatIndex} card=${card.id}`);
    try {
      this.applyPlayInternal(code, room, seatIndex, card.id, undefined);
      return true;
    } catch (e) {
      console.error(`[manager] autoPlay (${reason}) failed code=${code} seat=${seatIndex}`, e);
      return false;
    }
  }

  private applyPlayInternal(
    code: string,
    room: RoomInfo,
    seatIndex: PlayerIndex,
    playedCardId: string,
    combo?: string[]
  ) {
    if (!room.gameState) throw new Error('Room not ready');

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

    // If the round ended, we are now waiting for replay votes. Do not advance timers or auto-play.
    if (this.replayVotes.has(code)) {
      this.emitRoomSnapshot(code);
      return;
    }

    // If next player seat is vacant, immediately auto-play (don't wait 120s).
    if (room.seats[room.gameState.currentPlayerIndex] == null) {
      this.maybeAutoPlayVacantTurns(code, room);
      return;
    }

    this.startTurnTimer(code, room);
    this.emitRoomSnapshot(code);
  }

  handlePlay(code: string, socketId: string, playedCardId: string, combo?: string[]) {
    const room = this.rooms.get(code);
    if (!room || !room.gameState) throw new Error('Room not ready');

    // Prevent plays while waiting for replay votes between rounds.
    if (this.replayVotes.has(code)) throw new Error('Waiting for replay votes');

    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex < 0) throw new Error('Not seated');
    if (seatIndex !== room.gameState.currentPlayerIndex) {
      console.warn(
        `[manager] Not your turn socket=${socketId} seat=${seatIndex} current=${room.gameState.currentPlayerIndex}`
      );
      throw new Error('Not your turn');
    }
    console.log(
      `[manager] handlePlay code=${code} seat=${seatIndex} card=${playedCardId} combo=${combo?.join(',') ?? '-'}`
    );
    this.applyPlayInternal(code, room, seatIndex, playedCardId, combo);
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

      // Stop any running turn timer; we are transitioning to end-of-round state.
      this.clearTurnTimer(code, room);
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

      // Do NOT auto-start the next round. Wait for explicit replay votes.
      this.io
        .to(code)
        .emit('game:replayStatus', { count: 0, total: GameRoomManager.REPLAY_VOTES_REQUIRED });

      // Prepare next round state, but keep it pending until replay votes complete.
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

      const nextGameState: GameState = {
        tableCards,
        hands,
        capturesByTeam: [[], []],
        scoresByTeam: room.gameState!.scoresByTeam, // carry forward total scores
        currentPlayerIndex: 0,
        roundNumber: room.gameState!.roundNumber + 1,
        chkobbaByTeam: [0, 0],
      };

      // Store pending round start so we can begin immediately once all votes are in.
      const remainingDeck = newDeck; // after initial 16 dealt
      this.pendingNextRound.set(code, {
        gameState: nextGameState,
        remainingDeck,
        dealerIndex: 0,
        cardsLeftInDeal: 12,
      });

      this.emitRoomSnapshot(code);
    }
  }

  requestReplay(code: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');

    // Only accept replay votes after a round has ended.
    // A replay vote here is meant to dismiss the end-of-round overlay and continue
    // into the next round (scores should remain accumulated).
    const existing = this.replayVotes.get(code);
    if (!existing) return;

    // Only seated players can vote for replay.
    const seatIndex = room.seats.findIndex((s) => s === socketId);
    if (seatIndex < 0) return;

    const votes = existing;
    votes.add(socketId);
    this.replayVotes.set(code, votes);
    const count = votes.size;
    this.io
      .to(code)
      .emit('game:replayStatus', { count, total: GameRoomManager.REPLAY_VOTES_REQUIRED });

    if (count < GameRoomManager.REPLAY_VOTES_REQUIRED) return;

    // All votes in: start the pending round (if prepared).
    this.replayVotes.delete(code);
    const pending = this.pendingNextRound.get(code);
    if (!pending) return;
    this.pendingNextRound.delete(code);

    room.gameState = pending.gameState;
    this.roomDecks.set(code, pending.remainingDeck);
    this.roomDealerIndex.set(code, pending.dealerIndex);
    this.cardsLeftInCurrentDeal.set(code, pending.cardsLeftInDeal);

    this.io.to(code).emit('game:start', room.gameState);
    this.startTurnTimer(code, room);
    this.emitRoomSnapshot(code);
  }

  playSoundboard(code: string, socketId: string, soundFile: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (!GameRoomManager.isAllowedSoundboardFile(soundFile)) throw new Error('Invalid sound');
    const seatIndex = room.seats.findIndex((s) => s === socketId);
    if (seatIndex < 0) throw new Error('Not seated');
    this.io.to(code).emit('game:soundboard', { seatIndex, soundFile });
  }

  renameTeam(code: string, socketId: string, teamIndex: 0 | 1, name: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');

    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex < 0) throw new Error('Not seated');

    const callerTeam = TEAM_FOR_SEAT[seatIndex];
    if (callerTeam !== teamIndex) throw new Error('Not allowed');

    const trimmed = (name ?? '').trim();
    const length = [...trimmed].length;
    if (length < 1) throw new Error('Invalid team name');
    if (length > 5) throw new Error('Team name too long (max 5)');

    const current = room.teamNames ?? ['Team A', 'Team B'];
    const next: [string, string] = [current[0], current[1]];
    next[teamIndex] = trimmed;
    room.teamNames = next;

    this.emitRoomSnapshot(code);
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
    this.pendingNextRound.delete(code);
    this.roomTurn.delete(code);
    const t = this.roomTurnTimeout.get(code);
    if (t) clearTimeout(t);
    this.roomTurnTimeout.delete(code);
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
    const turn = this.roomTurn.get(code);
    const snapshot: RoomSnapshot = { ...room, turn: turn ?? room.turn, profiles };
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
