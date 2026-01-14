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
  type RoomSettings,
} from '../../../shared/types';
import { createDeck, shuffle } from './deck';
import { applyMove, findCombinationsForValue } from './rules';
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
  private roomBotActTimeout: Map<string, NodeJS.Timeout> = new Map();
  private static readonly DEFAULT_TURN_DURATION_MS = 60_000;
  private static readonly MIN_TURN_DURATION_MS = 10_000;
  private static readonly MAX_TURN_DURATION_MS = 180_000;
  private static readonly BOT_PREFIX = 'bot:';
  private avatarPool: string[] = [
    '/assets/avatars/avatar1.jpg',
    '/assets/avatars/avatar2.jpg',
    '/assets/avatars/avatar3.jpg',
    '/assets/avatars/avatar4.jpg',
    '/assets/avatars/avatar5.jpg',
    '/assets/avatars/avatar6.jpg',
    '/assets/avatars/avatar7.jpg',
    '/assets/avatars/avatar8.jpg',
    '/assets/avatars/avatar9.jpg',
    '/assets/avatars/avatar10.jpg',
    '/assets/avatars/avatar11.jpg',
  ];
  private botArabicNames: string[] = [
    // One-word Arabic names written in Latin alphabet (transliteration)
    'Noor',
    'Saif',
    'Laith',
    'Raad',
    'Fajr',
    'Badr',
    'Najm',
    'Qamar',
    'Ward',
    'Ghaith',
    'Zayn',
    'Saad',
    'Amin',
    'Karim',
    'Hakim',
    'Joud',
    'Fahd',
    'Bahr',
    'Tayyib',
    'Saqr',
  ];

  constructor(private readonly io: Server) {}

  private getClientGameState(room: RoomInfo, viewerSocketId: string): GameState {
    if (!room.gameState) throw new Error('Room not ready');

    const base = room.gameState;
    const handSizes: [number, number, number, number] = [
      base.hands[0]?.length ?? 0,
      base.hands[1]?.length ?? 0,
      base.hands[2]?.length ?? 0,
      base.hands[3]?.length ?? 0,
    ];

    const hiddenHands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];

    const viewerSeat = room.seats.findIndex((s) => s === viewerSocketId) as PlayerIndex;
    const settings = this.getRoomSettings(room);

    if (viewerSeat >= 0) {
      // Always reveal your own hand.
      hiddenHands[viewerSeat] = base.hands[viewerSeat];

      // In teams (4 players), reveal teammate hand as well.
      if (settings.playerCount === 4) {
        const teammate = (viewerSeat ^ 2) as PlayerIndex;
        hiddenHands[teammate] = base.hands[teammate];
      }
    }

    return {
      ...base,
      hands: hiddenHands,
      handSizes,
    };
  }

  private emitGameState(room: RoomInfo, event: 'game:start' | 'game:update') {
    const code = room.code;
    void this.io
      .in(code)
      .fetchSockets()
      .then((sockets) => {
        for (const s of sockets) {
          try {
            s.emit(event, this.getClientGameState(room, s.id));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        // ignore
      });
  }

  private getRoomSettings(room: RoomInfo): RoomSettings {
    // Default behavior matches the existing game: 4 players, teams, 60s turns.
    return (
      room.settings ?? {
        mode: 'teams',
        playerCount: 4,
        turnTimerEnabled: true,
        turnDurationMs: GameRoomManager.DEFAULT_TURN_DURATION_MS,
        fillWithBots: false,
      }
    );
  }

  private isTurnTimerEnabled(room: RoomInfo): boolean {
    return this.getRoomSettings(room).turnTimerEnabled !== false;
  }

  private static isBotId(id: string | null | undefined): id is string {
    return typeof id === 'string' && id.startsWith(GameRoomManager.BOT_PREFIX);
  }

  private generateBotId(roomCode: string, seat: PlayerIndex): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${GameRoomManager.BOT_PREFIX}${roomCode}:${seat}:${rand}`;
  }

  private pickUniqueBotName(room: RoomInfo): string {
    const used = new Set<string>();
    for (const sid of room.seats) {
      if (!GameRoomManager.isBotId(sid)) continue;
      const p = this.profiles.get(sid);
      if (p?.nickname) used.add(p.nickname);
    }

    const available = this.botArabicNames.filter((n) => !used.has(n));
    const base =
      (available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : this.botArabicNames[Math.floor(Math.random() * this.botArabicNames.length)]) || 'Noor';

    if (!used.has(base)) return base;

    // Fallback: keep it one token while ensuring uniqueness.
    let i = 2;
    while (used.has(`${base}${i}`) && i < 99) i++;
    return `${base}${i}`;
  }

  private ensureBotProfile(room: RoomInfo, botId: string) {
    const existing = this.profiles.get(botId);
    if (existing) {
      // Heal older bad defaults (e.g. .png paths) if they exist.
      if (
        !existing.avatar ||
        existing.avatar.endsWith('.png') ||
        existing.avatar === '/assets/avatars/default.png'
      ) {
        const avatar =
          this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] ||
          '/assets/avatars/default.svg';
        existing.avatar = avatar;
      }
      // Ensure bot names are latin and unique in this room.
      if (!existing.nickname || !/^[A-Za-z0-9]+$/.test(existing.nickname)) {
        existing.nickname = this.pickUniqueBotName(room);
      }
      return;
    }

    const nickname = this.pickUniqueBotName(room);
    const avatar =
      this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] ||
      '/assets/avatars/default.svg';
    this.profiles.set(botId, { socketId: botId, nickname, avatar });
  }

  private fillEmptySeatsWithBots(room: RoomInfo) {
    const settings = this.getRoomSettings(room);
    const activeSeats = this.getActiveSeats(room);
    if (!settings.fillWithBots) return;

    for (const seat of activeSeats) {
      if (room.seats[seat]) continue;
      const botId = this.generateBotId(room.code, seat);
      room.seats[seat] = botId;
      this.ensureBotProfile(room, botId);
    }
  }

  private getActiveSeats(room: RoomInfo): readonly PlayerIndex[] {
    const settings = this.getRoomSettings(room);
    return settings.playerCount === 2 ? ([0, 1] as const) : ([0, 1, 2, 3] as const);
  }

  private getReplayVotesRequired(room: RoomInfo): number {
    // Bots cannot vote; require replay votes only from human players.
    const activeSeats = this.getActiveSeats(room);
    let humans = 0;
    for (const seat of activeSeats) {
      const sid = room.seats[seat];
      if (sid && !GameRoomManager.isBotId(sid)) humans += 1;
    }
    return humans;
  }

  private getTurnDurationMs(room: RoomInfo): number {
    const ms = this.getRoomSettings(room).turnDurationMs;
    if (!Number.isFinite(ms)) return GameRoomManager.DEFAULT_TURN_DURATION_MS;
    return Math.max(
      GameRoomManager.MIN_TURN_DURATION_MS,
      Math.min(GameRoomManager.MAX_TURN_DURATION_MS, Math.round(ms))
    );
  }

  private nextActivePlayer(room: RoomInfo, current: PlayerIndex): PlayerIndex {
    const order = this.getActiveSeats(room);
    const idx = order.indexOf(current);
    if (idx < 0) return order[0];
    return order[(idx + 1) % order.length];
  }

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
      hostId: undefined,
      settings: {
        mode: 'teams',
        playerCount: 4,
        turnTimerEnabled: true,
        turnDurationMs: GameRoomManager.DEFAULT_TURN_DURATION_MS,
        fillWithBots: false,
      },
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

    const settings = this.getRoomSettings(room);
    // Only allow seating up to the configured player count.
    let openSeat = -1;
    for (let i = 0; i < settings.playerCount; i++) {
      if (room.seats[i] == null) {
        openSeat = i;
        break;
      }
    }
    // If the game is already running and seats are full, allow replacing a bot.
    if (openSeat < 0 && room.gameState) {
      let botSeat = -1;
      for (let i = 0; i < settings.playerCount; i++) {
        if (GameRoomManager.isBotId(room.seats[i])) {
          botSeat = i;
          break;
        }
      }
      if (botSeat >= 0) {
        openSeat = botSeat;
      }
    }

    if (openSeat < 0) throw new Error('Room full');

    room.players.push(socket.id);
    room.seats[openSeat] = socket.id;
    console.log(
      `[manager] joinRoom ${code} player=${socket.id} seat=${openSeat} count=${room.players.length}`
    );

    // First seated player becomes host.
    if (!room.hostId) room.hostId = socket.id;
    // The socket joins the room in the HTTP/Socket handler; avoid joining all sockets globally here.

    // ensure profile exists with defaults
    if (!this.profiles.has(socket.id)) {
      const nickname = this.generateReadableName();
      const avatar =
        this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] ||
        '/assets/avatars/default.svg';
      this.profiles.set(socket.id, { socketId: socket.id, nickname, avatar });
    }

    // If game already running, send the current state to the joining socket.
    if (room.gameState) {
      socket.emit('game:start', this.getClientGameState(room, socket.id));
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
        total: this.getReplayVotesRequired(room),
      });

      // Also broadcast updated totals to everyone (totals depend on human seats).
      this.io.to(code).emit('game:replayStatus', {
        count: votes.size,
        total: this.getReplayVotesRequired(room),
      });
    }
    this.emitRoomSnapshot(code);
    return room;
  }

  updateRoomSettings(code: string, socketId: string, patch: Partial<RoomSettings>) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (!room.hostId || room.hostId !== socketId) throw new Error('Not allowed');
    if (room.gameState) throw new Error('Game already started');

    const current = this.getRoomSettings(room);
    const next: RoomSettings = {
      ...current,
      ...patch,
    };

    // Normalize and validate
    if (next.playerCount !== 2 && next.playerCount !== 4) throw new Error('Invalid player count');
    next.mode = next.playerCount === 2 ? '1v1' : 'teams';

    if (typeof next.turnTimerEnabled !== 'boolean') {
      next.turnTimerEnabled = current.turnTimerEnabled !== false;
    }

    if (typeof next.fillWithBots !== 'boolean') {
      next.fillWithBots = Boolean(current.fillWithBots);
    }

    const ms = Math.round(Number(next.turnDurationMs));
    if (!Number.isFinite(ms)) throw new Error('Invalid turn time');
    next.turnDurationMs = Math.max(
      GameRoomManager.MIN_TURN_DURATION_MS,
      Math.min(GameRoomManager.MAX_TURN_DURATION_MS, ms)
    );

    const seated = room.seats.filter((s) => s != null).length;
    if (seated > next.playerCount) throw new Error('Too many players already seated');

    room.settings = next;
    this.emitRoomSnapshot(code);
  }

  launchGame(code: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (!room.hostId || room.hostId !== socketId) throw new Error('Not allowed');
    if (room.gameState) throw new Error('Game already started');

    // Host must be seated to launch.
    const hostSeat = room.seats.findIndex((s) => s === socketId);
    if (hostSeat < 0) throw new Error('Host must join the room first');

    const settings = this.getRoomSettings(room);
    const activeSeats = this.getActiveSeats(room);

    const seatedHumans = activeSeats.filter((seat) => {
      const sid = room.seats[seat];
      return sid != null && !GameRoomManager.isBotId(sid);
    }).length;

    if (settings.fillWithBots) {
      if (seatedHumans < 1) throw new Error('Not enough players');
      this.fillEmptySeatsWithBots(room);
    } else {
      for (const seat of activeSeats) {
        if (!room.seats[seat]) throw new Error('Not enough players');
      }
    }
    this.startGame(room);
  }

  private dealInitial(room: RoomInfo): { state: GameState; remainingDeck: Card[] } {
    const deck = shuffle(createDeck());
    const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const tableCards: Card[] = [];

    const activeSeats = this.getActiveSeats(room);

    // deal 3 cards to each active player
    for (let r = 0; r < 3; r++) {
      for (const p of activeSeats) {
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
      currentPlayerIndex: activeSeats[0] ?? 0,
      roundNumber: 1,
      chkobbaByTeam: [0, 0],
    };
    return { state, remainingDeck: deck };
  }

  private startGame(room: RoomInfo) {
    console.log(`[manager] startGame room=${room.code}`);
    const initial = this.dealInitial(room);
    const activeSeats = this.getActiveSeats(room);
    room.gameState = initial.state;
    // initialize deck and dealer state tracking using the remaining from initial shuffle
    // after dealInitial, deck already has the remaining cards beyond the initial 16
    this.roomDecks.set(room.code, initial.remainingDeck);
    // dealer is the first active seat at initial deal
    this.roomDealerIndex.set(room.code, activeSeats[0] ?? 0);
    // 3 cards per active player in a deal
    this.cardsLeftInCurrentDeal.set(room.code, activeSeats.length * 3);
    this.emitGameState(room, 'game:start');
    this.maybeStartTurnTimer(room.code, room);
    this.emitRoomSnapshot(room.code);
  }

  private clearBotActTimer(code: string) {
    const existingBot = this.roomBotActTimeout.get(code);
    if (existingBot) {
      clearTimeout(existingBot);
      this.roomBotActTimeout.delete(code);
    }
  }

  private scheduleBotTurnIfNeeded(code: string, room: RoomInfo) {
    if (!room.gameState) return;
    this.clearBotActTimer(code);

    const cur = room.gameState.currentPlayerIndex;
    const sid = room.seats[cur];
    if (!GameRoomManager.isBotId(sid)) return;

    const botTimeout = setTimeout(() => {
      this.handleBotTurnNoTimer(code, cur);
    }, 350);
    this.roomBotActTimeout.set(code, botTimeout);
  }

  private maybeStartTurnTimer(code: string, room: RoomInfo) {
    if (!this.isTurnTimerEnabled(room)) {
      // No timer UI and no auto-timeout.
      this.clearTurnTimer(code, room);
      this.clearBotActTimer(code);
      // Still let bots act quickly even without timers.
      this.scheduleBotTurnIfNeeded(code, room);
      return;
    }
    this.startTurnTimer(code, room);
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

      // If bots are enabled and a human disconnects mid-game, backfill their active seat with a bot.
      if (room.gameState && vacatedSeat != null) {
        const settings = this.getRoomSettings(room);
        const activeSeats = this.getActiveSeats(room);
        if (settings.fillWithBots && activeSeats.includes(vacatedSeat)) {
          const botId = this.generateBotId(code, vacatedSeat);
          room.seats[vacatedSeat] = botId;
          this.ensureBotProfile(room, botId);

          // If it was this seat's turn, restart timers so the bot acts immediately.
          if (room.gameState.currentPlayerIndex === vacatedSeat) {
            this.maybeStartTurnTimer(code, room);
          }
        }
      }

      // If we were waiting for replay, update total.
      const votes = this.replayVotes.get(code);
      if (votes) {
        votes.delete(socketId);
        this.io.to(code).emit('game:replayStatus', {
          count: votes.size,
          total: this.getReplayVotesRequired(room),
        });
      }

      // Host handover: if host left, pick the first remaining seated player.
      if (room.hostId === socketId) {
        const settings = this.getRoomSettings(room);
        let nextHost: string | undefined;
        for (let i = 0; i < settings.playerCount; i++) {
          const sid = room.seats[i];
          if (sid && !GameRoomManager.isBotId(sid)) {
            nextHost = sid;
            break;
          }
        }
        room.hostId = nextHost;
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

    const existingBot = this.roomBotActTimeout.get(code);
    if (existingBot) {
      clearTimeout(existingBot);
      this.roomBotActTimeout.delete(code);
    }

    const durationMs = this.getTurnDurationMs(room);
    const endsAt = Date.now() + durationMs;
    const turn: TurnInfo = { endsAt, durationMs };
    this.roomTurn.set(code, turn);
    room.turn = turn;

    this.io.to(code).emit('game:turnTimer', {
      currentPlayerIndex: room.gameState.currentPlayerIndex,
      endsAt,
      durationMs,
      serverNow: Date.now(),
    });

    const expectedPlayer = room.gameState.currentPlayerIndex;
    const timeout = setTimeout(() => {
      this.handleTurnTimeout(code, expectedPlayer, endsAt);
    }, durationMs + 50);
    this.roomTurnTimeout.set(code, timeout);

    // If it's a bot's turn, act quickly (do not wait for full turn duration).
    const sid = room.seats[expectedPlayer];
    if (GameRoomManager.isBotId(sid)) {
      const botTimeout = setTimeout(() => {
        this.handleBotTurn(code, expectedPlayer, endsAt);
      }, 350);
      this.roomBotActTimeout.set(code, botTimeout);
    }
  }

  private handleBotTurnNoTimer(code: string, expectedPlayer: PlayerIndex) {
    const room = this.rooms.get(code);
    if (!room?.gameState) return;
    if (room.gameState.currentPlayerIndex !== expectedPlayer) return;

    const sid = room.seats[expectedPlayer];
    if (!GameRoomManager.isBotId(sid)) return;

    const played = this.autoPlayBotStrategic(code, room, expectedPlayer);
    if (played) return;
    this.autoPlayRandom(code, room, expectedPlayer, 'vacant');
  }

  private handleBotTurn(code: string, expectedPlayer: PlayerIndex, expectedEndsAt: number) {
    const room = this.rooms.get(code);
    if (!room?.gameState) return;

    const turn = this.roomTurn.get(code);
    if (!turn || turn.endsAt !== expectedEndsAt) return; // stale
    if (room.gameState.currentPlayerIndex !== expectedPlayer) return; // already advanced

    const sid = room.seats[expectedPlayer];
    if (!GameRoomManager.isBotId(sid)) return;

    const played = this.autoPlayBotStrategic(code, room, expectedPlayer);
    if (played) return;

    // Fallback: if strategy fails for any reason, play random.
    this.autoPlayRandom(code, room, expectedPlayer, 'vacant');
  }

  private autoPlayBotStrategic(code: string, room: RoomInfo, seatIndex: PlayerIndex): boolean {
    if (!room.gameState) return false;
    const hand = room.gameState.hands[seatIndex];
    if (!hand || hand.length === 0) return false;

    const table = room.gameState.tableCards;

    // Strategy: prefer captures; prefer chkobba; then most cards captured; otherwise drop lowest value.
    let best: {
      cardId: string;
      comboIds?: string[];
      score: number;
    } | null = null;

    for (const card of hand) {
      // Single match capture has priority in the rules anyway, but we score it explicitly.
      const single = table.find((c) => c.value === card.value);
      if (single) {
        const clears = table.length === 1;
        const score = (clears ? 1_000 : 0) + 200 + 20 - card.value;
        const cand = { cardId: card.id, comboIds: undefined, score };
        if (!best || cand.score > best.score) best = cand;
        continue;
      }

      const combos = findCombinationsForValue(table, card.value);
      if (combos.length > 0) {
        for (const combo of combos) {
          const clears = combo.length === table.length;
          const score = (clears ? 1_000 : 0) + 100 + combo.length * 10 - card.value;
          const cand = { cardId: card.id, comboIds: combo.map((c) => c.id), score };
          if (!best || cand.score > best.score) best = cand;
        }
      } else {
        // no capture; dropping a low card is usually safer
        const score = -card.value;
        const cand = { cardId: card.id, comboIds: undefined, score };
        if (!best || cand.score > best.score) best = cand;
      }
    }

    if (!best) return false;

    try {
      this.applyPlayInternal(code, room, seatIndex, best.cardId, best.comboIds);
      return true;
    } catch (e) {
      console.error(`[manager] autoPlay (bot) failed code=${code} seat=${seatIndex}`, e);
      return false;
    }
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
      this.emitGameState(room, 'game:update');
    } else {
      room.gameState.currentPlayerIndex = this.nextActivePlayer(room, cur);
      this.emitGameState(room, 'game:update');
    }

    if (room.seats[room.gameState.currentPlayerIndex] == null) {
      this.maybeAutoPlayVacantTurns(code, room);
      return;
    }

    this.maybeStartTurnTimer(code, room);
    this.emitRoomSnapshot(code);
  }

  private maybeAutoPlayVacantTurns(code: string, room: RoomInfo) {
    if (!room.gameState) return;
    const activeSeats = this.getActiveSeats(room);
    // Guard against runaway loops in corrupted states.
    for (let i = 0; i < Math.max(8, activeSeats.length * 6); i++) {
      const cur = room.gameState.currentPlayerIndex;
      // If currentPlayerIndex drifted to an inactive seat, snap forward.
      if (!activeSeats.includes(cur)) {
        room.gameState.currentPlayerIndex = activeSeats[0] ?? 0;
        continue;
      }
      if (room.seats[cur] != null) {
        this.maybeStartTurnTimer(code, room);
        this.emitRoomSnapshot(code);
        return;
      }
      // Seat is empty; play a random card immediately.
      const hand = room.gameState.hands[cur];
      if (!hand || hand.length === 0) {
        // Can't play; just advance to avoid deadlock.
        room.gameState.currentPlayerIndex = this.nextActivePlayer(room, cur);
        continue;
      }
      const played = this.autoPlayRandom(code, room, cur, 'vacant');
      if (!played) {
        room.gameState.currentPlayerIndex = this.nextActivePlayer(room, cur);
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

    const playedCard = room.gameState.hands[seatIndex]?.find((c) => c.id === playedCardId) || null;
    if (!playedCard) throw new Error('Card not in hand');

    const res = applyMove(
      room.gameState,
      seatIndex,
      playedCardId,
      combo,
      this.getActiveSeats(room)
    );

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

    room.gameState.lastPlay = {
      seatIndex,
      played: playedCard,
      capturedTableCardIds: res.captured.map((c) => c.id).filter((id) => id !== playedCardId),
      t: Date.now(),
    };

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

    this.emitGameState(room, 'game:update');

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

    this.maybeStartTurnTimer(code, room);
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
    const activeSeats = this.getActiveSeats(room);
    const cardsPerDeal = activeSeats.length * 3;
    // if deck still has cards, deal next 3 cards to each active player
    if (deck.length >= cardsPerDeal) {
      for (let r = 0; r < 3; r++) {
        for (const p of activeSeats) {
          const c = deck.shift();
          if (!c) break;
          room.gameState!.hands[p].push(c);
        }
      }
      // reset turns left for new deal
      this.cardsLeftInCurrentDeal.set(code, cardsPerDeal);
      // dealer rotates within active seats
      const prevDealer = this.roomDealerIndex.get(code) ?? 0;
      const idx = activeSeats.indexOf(prevDealer);
      const nextDealer = (
        idx >= 0 ? activeSeats[(idx + 1) % activeSeats.length] : activeSeats[0]
      ) as PlayerIndex;
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
        .emit('game:replayStatus', { count: 0, total: this.getReplayVotesRequired(room) });

      // Prepare next round state, but keep it pending until replay votes complete.
      const newDeck = shuffle(createDeck());
      const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
      const tableCards: Card[] = [];
      const nextActiveSeats = this.getActiveSeats(room);
      for (let r = 0; r < 3; r++) {
        for (const p of nextActiveSeats) {
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
        currentPlayerIndex: nextActiveSeats[0] ?? 0,
        roundNumber: room.gameState!.roundNumber + 1,
        chkobbaByTeam: [0, 0],
      };

      // Store pending round start so we can begin immediately once all votes are in.
      const remainingDeck = newDeck; // after initial 16 dealt
      this.pendingNextRound.set(code, {
        gameState: nextGameState,
        remainingDeck,
        dealerIndex: (nextActiveSeats[0] ?? 0) as PlayerIndex,
        cardsLeftInDeal: nextActiveSeats.length * 3,
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
    const total = this.getReplayVotesRequired(room);
    this.io.to(code).emit('game:replayStatus', { count, total });

    if (count < total) return;

    // All votes in: start the pending round (if prepared).
    this.replayVotes.delete(code);
    const pending = this.pendingNextRound.get(code);
    if (!pending) return;
    this.pendingNextRound.delete(code);

    room.gameState = pending.gameState;
    this.roomDecks.set(code, pending.remainingDeck);
    this.roomDealerIndex.set(code, pending.dealerIndex);
    this.cardsLeftInCurrentDeal.set(code, pending.cardsLeftInDeal);

    this.emitGameState(room, 'game:start');
    this.maybeStartTurnTimer(code, room);
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
    const bt = this.roomBotActTimeout.get(code);
    if (bt) clearTimeout(bt);
    this.roomBotActTimeout.delete(code);
  }

  setProfile(socketId: string, payload: Partial<PlayerProfile>) {
    console.log(`[manager] setProfile ${socketId} ->`, payload);
    const current = this.profiles.get(socketId) || {
      socketId,
      nickname: this.generateReadableName(),
      avatar: '/assets/avatars/default.svg',
    };
    const nickname =
      (payload.nickname && payload.nickname.trim()) ||
      current.nickname ||
      this.generateReadableName();
    const avatar = payload.avatar || current.avatar || '/assets/avatars/default.svg';
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

    // Include profiles for all seated ids (humans + bots) so UI can render avatars/names.
    for (const sid of room.seats) {
      if (!sid) continue;
      const p = this.profiles.get(sid);
      if (p) profiles[sid] = p;
    }

    // Also include any connected players (covers humans that are in room.players but not seated, if that ever happens).
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
