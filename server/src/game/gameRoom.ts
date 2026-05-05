import { Server, Socket } from 'socket.io';
import {
  PlayerIndex,
  TEAM_FOR_SEAT,
  PlayerProfile,
  type RoomSettings,
} from '../../../shared/types';
import { Room } from './Room';
import { pickBotMove } from './botStrategy';

export class GameRoomManager {
  private rooms: Map<string, Room> = new Map();
  private profiles: Map<string, PlayerProfile> = new Map();
  /** O(1) socket→room lookup for fast disconnect handling. */
  private socketToRoom: Map<string, string> = new Map();

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

  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly io: Server) {
    // Periodically clean up expired rooms to prevent memory leaks.
    this.cleanupInterval = setInterval(() => this.cleanupExpiredRooms(), 5 * 60_000);
    // Allow GC if server shuts down cleanly.
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  // ─── Room lifecycle ───

  createRoom(): Room {
    const code = Room.generateUniqueCode(this.rooms);
    console.log(`[manager] createRoom ${code}`);
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, socket: Socket): Room {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    room.touch();

    if (room.players.includes(socket.id)) return room;
    const existingSeat = room.seats.findIndex((s) => s === socket.id);
    if (existingSeat >= 0) return room;

    // Find open seat
    let openSeat = -1;
    for (let i = 0; i < room.settings.playerCount; i++) {
      if (room.seats[i] == null) {
        openSeat = i;
        break;
      }
    }
    // Allow replacing a bot mid-game
    if (openSeat < 0 && room.gameState) {
      for (let i = 0; i < room.settings.playerCount; i++) {
        if (Room.isBotId(room.seats[i])) {
          openSeat = i;
          break;
        }
      }
    }
    if (openSeat < 0) throw new Error('Room full');

    room.players.push(socket.id);
    room.seats[openSeat] = socket.id;
    this.socketToRoom.set(socket.id, code);

    // Join the Socket.IO room HERE so emits are immediate
    void socket.join(code);

    console.log(
      `[manager] joinRoom ${code} player=${socket.id} seat=${openSeat} count=${room.players.length}`
    );

    if (!room.hostId) room.hostId = socket.id;

    if (!this.profiles.has(socket.id)) {
      this.profiles.set(socket.id, {
        socketId: socket.id,
        nickname: this.generateReadableName(),
        avatar: this.randomAvatar(),
      });
    }

    // If game running, send current state to the joining socket
    if (room.gameState) {
      socket.emit('game:start', room.getClientGameState(socket.id));
      if (room.turn) {
        socket.emit('game:turnTimer', {
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          endsAt: room.turn.endsAt,
          durationMs: room.turn.durationMs,
          serverNow: Date.now(),
        });
      }
    }

    // Replay status for joiner
    if (room.replayVotes) {
      const status = { count: room.replayVotes.size, total: room.replayVotesRequired };
      socket.emit('game:replayStatus', status);
      this.io.to(code).emit('game:replayStatus', status);
    }

    this.emitRoomSnapshot(room);
    return room;
  }

  updateRoomSettings(code: string, socketId: string, patch: Partial<RoomSettings>) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== socketId) throw new Error('Not allowed');
    if (room.gameState) throw new Error('Game already started');
    room.touch();

    const current = room.settings;
    const next: RoomSettings = { ...current, ...patch };

    if (next.playerCount !== 2 && next.playerCount !== 4) throw new Error('Invalid player count');
    next.mode = next.playerCount === 2 ? '1v1' : 'teams';
    if (typeof next.turnTimerEnabled !== 'boolean')
      next.turnTimerEnabled = current.turnTimerEnabled !== false;
    if (typeof next.fillWithBots !== 'boolean') next.fillWithBots = Boolean(current.fillWithBots);

    const ms = Math.round(Number(next.turnDurationMs));
    if (!Number.isFinite(ms)) throw new Error('Invalid turn time');
    next.turnDurationMs = Math.max(
      Room.MIN_TURN_DURATION_MS,
      Math.min(Room.MAX_TURN_DURATION_MS, ms)
    );

    const seated = room.seats.filter((s) => s != null).length;
    if (seated > next.playerCount) throw new Error('Too many players already seated');

    room.settings = next;
    this.emitRoomSnapshot(room);
  }

  launchGame(code: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== socketId) throw new Error('Not allowed');
    if (room.gameState) throw new Error('Game already started');
    room.touch();

    const hostSeat = room.seats.findIndex((s) => s === socketId);
    if (hostSeat < 0) throw new Error('Host must join the room first');

    const activeSeats = room.activeSeats;
    const seatedHumans = activeSeats.filter((seat) => {
      const sid = room.seats[seat];
      return sid != null && !Room.isBotId(sid);
    }).length;

    if (room.settings.fillWithBots) {
      if (seatedHumans < 1) throw new Error('Not enough players');
      this.fillEmptySeatsWithBots(room);
    } else {
      for (const seat of activeSeats) {
        if (!room.seats[seat]) throw new Error('Not enough players');
      }
    }

    this.startGame(room);
  }

  handlePlay(code: string, socketId: string, playedCardId: string, combo?: string[]) {
    const room = this.rooms.get(code);
    if (!room?.gameState) throw new Error('Room not ready');
    if (room.replayVotes) throw new Error('Waiting for replay votes');
    room.touch();

    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex < 0) throw new Error('Not seated');
    if (seatIndex !== room.gameState.currentPlayerIndex) throw new Error('Not your turn');

    this.applyPlayInternal(room, seatIndex, playedCardId, combo);
  }

  requestReplay(code: string, socketId: string) {
    const room = this.rooms.get(code);
    if (!room?.replayVotes) return;
    room.touch();

    const seatIndex = room.seats.findIndex((s) => s === socketId);
    if (seatIndex < 0) return;

    room.replayVotes.add(socketId);
    const count = room.replayVotes.size;
    const total = room.replayVotesRequired;
    this.io.to(code).emit('game:replayStatus', { count, total });

    if (count < total) return;

    // All votes in
    if (!room.startPendingRound()) return;

    this.emitGameState(room, 'game:start');
    this.maybeStartTurnTimer(room);
    this.emitRoomSnapshot(room);
  }

  playSoundboard(code: string, socketId: string, soundFile: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (!Room.isAllowedSoundboardFile(soundFile)) throw new Error('Invalid sound');
    const seatIndex = room.seats.findIndex((s) => s === socketId);
    if (seatIndex < 0) throw new Error('Not seated');
    this.io.to(code).emit('game:soundboard', { seatIndex, soundFile });
  }

  renameTeam(code: string, socketId: string, teamIndex: 0 | 1, name: string) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    room.touch();

    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex < 0) throw new Error('Not seated');
    if (TEAM_FOR_SEAT[seatIndex] !== teamIndex) throw new Error('Not allowed');

    const trimmed = (name ?? '').trim();
    const length = [...trimmed].length;
    if (length < 1) throw new Error('Invalid team name');
    if (length > 5) throw new Error('Team name too long (max 5)');

    const next: [string, string] = [...room.teamNames] as [string, string];
    next[teamIndex] = trimmed;
    room.teamNames = next;
    this.emitRoomSnapshot(room);
  }

  quitRoom(code: string, _socketId: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    console.log(`[manager] quitRoom ${code}`);
    this.io.to(code).emit('room:closed', { code });
    this.destroyRoom(room);
  }

  setProfile(socketId: string, payload: Partial<PlayerProfile>) {
    const current = this.profiles.get(socketId) || {
      socketId,
      nickname: this.generateReadableName(),
      avatar: '/assets/avatars/default.svg',
    };
    let nickname = payload.nickname?.trim() || current.nickname || this.generateReadableName();
    // Enforce length limit to prevent abuse
    if ([...nickname].length > Room.MAX_NICKNAME_LENGTH) {
      nickname = [...nickname].slice(0, Room.MAX_NICKNAME_LENGTH).join('');
    }
    const avatar = payload.avatar || current.avatar || '/assets/avatars/default.svg';
    this.profiles.set(socketId, { socketId, nickname, avatar });

    // Emit snapshot to all rooms this socket belongs to
    const roomCode = this.socketToRoom.get(socketId);
    if (roomCode) {
      const room = this.rooms.get(roomCode);
      if (room) this.emitRoomSnapshot(room);
    }
  }

  handleDisconnect(socketId: string) {
    const code = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    // Cancel any pending turn/bot timers tied to this socket's seat. If a bot
    // backfill or vacant-turn handler needs a new timer it will start one.
    room.clearTimers();

    room.players = room.players.filter((p) => p !== socketId);
    let vacatedSeat: PlayerIndex | null = null;
    for (let i = 0; i < room.seats.length; i++) {
      if (room.seats[i] === socketId) {
        room.seats[i] = null;
        vacatedSeat = i as PlayerIndex;
      }
    }

    // Backfill with bot if enabled
    if (room.gameState && vacatedSeat != null) {
      if (room.settings.fillWithBots && room.activeSeats.includes(vacatedSeat)) {
        const botId = this.generateBotId(code, vacatedSeat);
        room.seats[vacatedSeat] = botId;
        this.ensureBotProfile(room, botId);
        if (room.gameState.currentPlayerIndex === vacatedSeat) {
          this.maybeStartTurnTimer(room);
        }
      }
    }

    // Update replay tracking
    if (room.replayVotes) {
      room.replayVotes.delete(socketId);
      this.io.to(code).emit('game:replayStatus', {
        count: room.replayVotes.size,
        total: room.replayVotesRequired,
      });
    }

    // Host handover
    if (room.hostId === socketId) {
      let nextHost: string | undefined;
      for (let i = 0; i < room.settings.playerCount; i++) {
        const sid = room.seats[i];
        if (sid && !Room.isBotId(sid)) {
          nextHost = sid;
          break;
        }
      }
      room.hostId = nextHost;
    }

    this.emitRoomSnapshot(room);

    // If room is now empty, destroy it
    const hasHumans = room.seats.some((s) => s && !Room.isBotId(s));
    if (!hasHumans && room.players.length === 0) {
      this.destroyRoom(room);
      return;
    }

    // Handle vacant turn
    if (room.gameState) {
      const cur = room.gameState.currentPlayerIndex;
      if (room.seats[cur] == null || cur === vacatedSeat) {
        this.maybeAutoPlayVacantTurns(room);
      }
    }
  }

  // ─── Internal game logic ───

  private startGame(room: Room) {
    console.log(`[manager] startGame room=${room.code}`);
    const initial = room.dealInitial();
    room.gameState = initial.state;
    room.deck = initial.remainingDeck;
    room.dealerIndex = room.activeSeats[0] ?? 0;
    room.cardsLeftInCurrentDeal = room.activeSeats.length * 3;

    this.emitGameState(room, 'game:start');
    this.maybeStartTurnTimer(room);
    this.emitRoomSnapshot(room);
  }

  private applyPlayInternal(
    room: Room,
    seatIndex: PlayerIndex,
    playedCardId: string,
    combo?: string[]
  ) {
    room.applyPlay(seatIndex, playedCardId, combo);
    console.log(
      `[manager] turn advanced next=${room.gameState!.currentPlayerIndex} remainingInDeal=${room.cardsLeftInCurrentDeal}`
    );

    if (room.cardsLeftInCurrentDeal <= 0) {
      console.log(
        `[manager] deal completed for room=${room.code}; proceeding next deal or end round`
      );
      const result = room.nextDealOrEndRound();

      if (result === 'roundEnd') {
        room.clearTimers();
        const roundScore = room.roundScoreDetails;
        this.io.to(room.code).emit('game:roundEnd', {
          scores: room.gameState!.scoresByTeam,
          details: roundScore?.details,
        });
        this.io
          .to(room.code)
          .emit('game:replayStatus', { count: 0, total: room.replayVotesRequired });
        this.emitGameState(room, 'game:update');
        this.emitRoomSnapshot(room);
        return;
      }
    }

    this.emitGameState(room, 'game:update');

    if (room.replayVotes) {
      this.emitRoomSnapshot(room);
      return;
    }

    if (room.seats[room.gameState!.currentPlayerIndex] == null) {
      this.maybeAutoPlayVacantTurns(room);
      return;
    }

    this.maybeStartTurnTimer(room);
    this.emitRoomSnapshot(room);
  }

  private emitGameState(room: Room, event: 'game:start' | 'game:update') {
    void this.io
      .in(room.code)
      .fetchSockets()
      .then((sockets) => {
        for (const s of sockets) {
          try {
            s.emit(event, room.getClientGameState(s.id));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* ignore */
      });
  }

  private emitRoomSnapshot(room: Room) {
    const snapshot = room.toSnapshot(this.profiles);
    this.io.to(room.code).emit('room:snapshot', snapshot);
    this.io.to(room.code).emit('room:update', snapshot);
  }

  // ─── Turn timers ───

  private maybeStartTurnTimer(room: Room) {
    if (!room.isTurnTimerEnabled) {
      room.clearTimers();
      this.scheduleBotTurnIfNeeded(room);
      return;
    }
    this.startTurnTimer(room);
  }

  private startTurnTimer(room: Room) {
    if (!room.gameState) return;
    room.clearTimers();

    const durationMs = room.turnDurationMs;
    const endsAt = Date.now() + durationMs;
    room.turn = { endsAt, durationMs };

    this.io.to(room.code).emit('game:turnTimer', {
      currentPlayerIndex: room.gameState.currentPlayerIndex,
      endsAt,
      durationMs,
      serverNow: Date.now(),
    });

    const expectedPlayer = room.gameState.currentPlayerIndex;
    room.turnTimeout = setTimeout(() => {
      this.handleTurnTimeout(room.code, expectedPlayer, endsAt);
    }, durationMs + 50);

    // If bot's turn, act quickly
    const sid = room.seats[expectedPlayer];
    if (Room.isBotId(sid)) {
      const botDelayMs = this.getBotActionDelayMs(room, durationMs);
      room.botActTimeout = setTimeout(() => {
        this.handleBotTurn(room.code, expectedPlayer, endsAt);
      }, botDelayMs);
    }
  }

  private scheduleBotTurnIfNeeded(room: Room) {
    if (!room.gameState) return;
    room.clearBotActTimer();

    const cur = room.gameState.currentPlayerIndex;
    const sid = room.seats[cur];
    if (!Room.isBotId(sid)) return;

    room.botActTimeout = setTimeout(() => {
      this.handleBotTurnNoTimer(room.code, cur);
    }, this.getBotActionDelayMs(room));
  }

  private handleTurnTimeout(code: string, expectedPlayer: PlayerIndex, expectedEndsAt: number) {
    const room = this.rooms.get(code);
    if (!room?.gameState) return;
    if (room.turn?.endsAt !== expectedEndsAt) return;
    if (room.gameState.currentPlayerIndex !== expectedPlayer) return;

    const played = this.autoPlayRandom(room, expectedPlayer);
    if (played) return;

    // Force progress
    const allEmpty = room.gameState.hands.every((h) => h.length === 0);
    if (allEmpty) {
      room.cardsLeftInCurrentDeal = 0;
      room.nextDealOrEndRound();
      this.emitGameState(room, 'game:update');
    } else {
      room.gameState.currentPlayerIndex = room.nextActivePlayer(expectedPlayer);
      this.emitGameState(room, 'game:update');
    }

    if (room.seats[room.gameState.currentPlayerIndex] == null) {
      this.maybeAutoPlayVacantTurns(room);
      return;
    }

    this.maybeStartTurnTimer(room);
    this.emitRoomSnapshot(room);
  }

  private handleBotTurn(code: string, expectedPlayer: PlayerIndex, expectedEndsAt: number) {
    const room = this.rooms.get(code);
    if (!room?.gameState) return;
    if (room.turn?.endsAt !== expectedEndsAt) return;
    if (room.gameState.currentPlayerIndex !== expectedPlayer) return;
    if (!Room.isBotId(room.seats[expectedPlayer])) return;

    if (!this.autoPlayBotStrategic(room, expectedPlayer)) {
      this.autoPlayRandom(room, expectedPlayer);
    }
  }

  private handleBotTurnNoTimer(code: string, expectedPlayer: PlayerIndex) {
    const room = this.rooms.get(code);
    if (!room?.gameState) return;
    if (room.gameState.currentPlayerIndex !== expectedPlayer) return;
    if (!Room.isBotId(room.seats[expectedPlayer])) return;

    if (!this.autoPlayBotStrategic(room, expectedPlayer)) {
      this.autoPlayRandom(room, expectedPlayer);
    }
  }

  private autoPlayBotStrategic(room: Room, seatIndex: PlayerIndex): boolean {
    if (!room.gameState) return false;
    const hand = room.gameState.hands[seatIndex];
    if (!hand?.length) return false;

    const move = pickBotMove(hand, room.gameState.tableCards);
    if (!move) return false;

    try {
      this.applyPlayInternal(room, seatIndex, move.cardId, move.comboIds);
      return true;
    } catch (e) {
      console.error(`[manager] autoPlay (bot) failed room=${room.code} seat=${seatIndex}`, e);
      return false;
    }
  }

  private autoPlayRandom(room: Room, seatIndex: PlayerIndex): boolean {
    if (!room.gameState) return false;
    const hand = room.gameState.hands[seatIndex];
    if (!hand?.length) return false;

    const card = hand[Math.floor(Math.random() * hand.length)];
    if (!card) return false;

    try {
      this.applyPlayInternal(room, seatIndex, card.id, undefined);
      return true;
    } catch (e) {
      console.error(`[manager] autoPlay failed room=${room.code} seat=${seatIndex}`, e);
      return false;
    }
  }

  private maybeAutoPlayVacantTurns(room: Room) {
    if (!room.gameState) return;
    const activeSeats = room.activeSeats;

    for (let i = 0; i < Math.max(8, activeSeats.length * 6); i++) {
      const cur = room.gameState.currentPlayerIndex;
      if (!activeSeats.includes(cur)) {
        room.gameState.currentPlayerIndex = activeSeats[0] ?? 0;
        continue;
      }
      if (room.seats[cur] != null) {
        this.maybeStartTurnTimer(room);
        this.emitRoomSnapshot(room);
        return;
      }
      const hand = room.gameState.hands[cur];
      if (!hand?.length) {
        room.gameState.currentPlayerIndex = room.nextActivePlayer(cur);
        continue;
      }
      if (!this.autoPlayRandom(room, cur)) {
        room.gameState.currentPlayerIndex = room.nextActivePlayer(cur);
      }
    }
  }

  // ─── Bot helpers ───

  private getBotActionDelayMs(room: Room, turnDurationMs?: number): number {
    let humans = 0,
      bots = 0;
    for (const seat of room.activeSeats) {
      const sid = room.seats[seat];
      if (!sid) continue;
      if (Room.isBotId(sid)) bots++;
      else humans++;
    }
    const fullBots = humans === 0 && bots > 0;
    // Minimum 1500ms so card-flight animations (~920ms max) finish before next play.
    const base = fullBots ? 1200 : 1600;
    const jitter = fullBots ? 600 : 500;
    let delay = base + Math.floor(Math.random() * jitter);

    if (typeof turnDurationMs === 'number' && Number.isFinite(turnDurationMs)) {
      delay = Math.min(delay, Math.max(500, Math.round(turnDurationMs - 750)));
    }
    return Math.max(1500, Math.min(3_000, delay));
  }

  private generateBotId(roomCode: string, seat: PlayerIndex): string {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${Room.BOT_PREFIX}${roomCode}:${seat}:${rand}`;
  }

  private pickUniqueBotName(room: Room): string {
    const used = new Set<string>();
    for (const sid of room.seats) {
      if (!Room.isBotId(sid)) continue;
      const p = this.profiles.get(sid!);
      if (p?.nickname) used.add(p.nickname);
    }
    const available = this.botArabicNames.filter((n) => !used.has(n));
    const base =
      (available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : this.botArabicNames[Math.floor(Math.random() * this.botArabicNames.length)]) || 'Noor';
    if (!used.has(base)) return base;
    let i = 2;
    while (used.has(`${base}${i}`) && i < 99) i++;
    return `${base}${i}`;
  }

  private ensureBotProfile(room: Room, botId: string) {
    const existing = this.profiles.get(botId);
    if (existing) {
      if (
        !existing.avatar ||
        existing.avatar.endsWith('.png') ||
        existing.avatar === '/assets/avatars/default.png'
      ) {
        existing.avatar = this.randomAvatar();
      }
      if (!existing.nickname || !/^[A-Za-z0-9]+$/.test(existing.nickname)) {
        existing.nickname = this.pickUniqueBotName(room);
      }
      return;
    }
    this.profiles.set(botId, {
      socketId: botId,
      nickname: this.pickUniqueBotName(room),
      avatar: this.randomAvatar(),
    });
  }

  private fillEmptySeatsWithBots(room: Room) {
    if (!room.settings.fillWithBots) return;
    for (const seat of room.activeSeats) {
      if (room.seats[seat]) continue;
      const botId = this.generateBotId(room.code, seat);
      room.seats[seat] = botId;
      this.ensureBotProfile(room, botId);
    }
  }

  // ─── Cleanup ───

  private destroyRoom(room: Room) {
    room.clearTimers();
    // Clean up socket→room mappings
    for (const sid of room.players) {
      this.socketToRoom.delete(sid);
    }
    this.rooms.delete(room.code);
  }

  private cleanupExpiredRooms() {
    for (const [code, room] of this.rooms) {
      if (room.isExpired()) {
        console.log(`[manager] cleanup expired room ${code}`);
        this.io.to(code).emit('room:closed', { code });
        this.destroyRoom(room);
      }
    }
  }

  // ─── Utility ───

  private randomAvatar(): string {
    return (
      this.avatarPool[Math.floor(Math.random() * this.avatarPool.length)] ||
      '/assets/avatars/default.svg'
    );
  }

  private generateReadableName(): string {
    const adjectives = ['Calm', 'Bright', 'Swift', 'Lucky', 'Sunny', 'Cozy', 'Merry', 'Brave'];
    const nouns = ['Falcon', 'Olive', 'Cedar', 'Caravan', 'Harbor', 'Atlas', 'Nomad', 'Sahara'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
}
