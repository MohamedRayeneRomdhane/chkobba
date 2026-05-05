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
import { applyMove } from './rules';
import { computeRoundScore } from './scoring';
import { pickBotMove } from './botStrategy';

/** All state for a single game room, encapsulated in one object. */
export class Room {
  static readonly DEFAULT_TURN_DURATION_MS = 60_000;
  static readonly MIN_TURN_DURATION_MS = 10_000;
  static readonly MAX_TURN_DURATION_MS = 180_000;
  static readonly BOT_PREFIX = 'bot:';
  static readonly MAX_NICKNAME_LENGTH = 20;
  static readonly MAX_ROOM_IDLE_MS = 30 * 60_000; // 30 minutes

  readonly code: string;
  players: string[] = [];
  seats: (string | null)[] = [null, null, null, null];
  teams: [[PlayerIndex, PlayerIndex], [PlayerIndex, PlayerIndex]] = [
    [0, 2],
    [1, 3],
  ];
  teamNames: [string, string] = ['Team A', 'Team B'];
  hostId: string | undefined;
  settings: RoomSettings;
  gameState: GameState | undefined;
  turn: TurnInfo | undefined;
  lastActivityAt: number = Date.now();

  // Per-room state previously scattered across parallel Maps
  deck: Card[] = [];
  dealerIndex: PlayerIndex = 0;
  cardsLeftInCurrentDeal = 0;
  replayVotes: Set<string> | null = null;
  pendingNextRound: {
    gameState: GameState;
    remainingDeck: Card[];
    dealerIndex: PlayerIndex;
    cardsLeftInDeal: number;
  } | null = null;

  turnTimeout: NodeJS.Timeout | null = null;
  botActTimeout: NodeJS.Timeout | null = null;

  constructor(code: string) {
    this.code = code;
    this.settings = {
      mode: 'teams',
      playerCount: 4,
      turnTimerEnabled: true,
      turnDurationMs: Room.DEFAULT_TURN_DURATION_MS,
      fillWithBots: false,
    };
  }

  /** Touch activity timestamp. */
  touch() {
    this.lastActivityAt = Date.now();
  }

  /** Whether this room has been idle longer than the max. */
  isExpired(): boolean {
    return Date.now() - this.lastActivityAt > Room.MAX_ROOM_IDLE_MS;
  }

  get activeSeats(): readonly PlayerIndex[] {
    return this.settings.playerCount === 2 ? ([0, 1] as const) : ([0, 1, 2, 3] as const);
  }

  get turnDurationMs(): number {
    const ms = this.settings.turnDurationMs;
    if (!Number.isFinite(ms)) return Room.DEFAULT_TURN_DURATION_MS;
    return Math.max(Room.MIN_TURN_DURATION_MS, Math.min(Room.MAX_TURN_DURATION_MS, Math.round(ms)));
  }

  get isTurnTimerEnabled(): boolean {
    return this.settings.turnTimerEnabled !== false;
  }

  nextActivePlayer(current: PlayerIndex): PlayerIndex {
    const order = this.activeSeats;
    const idx = order.indexOf(current);
    if (idx < 0) return order[0] as PlayerIndex;
    return order[(idx + 1) % order.length] as PlayerIndex;
  }

  /** Number of human players who must vote for replay. */
  get replayVotesRequired(): number {
    let humans = 0;
    for (const seat of this.activeSeats) {
      const sid = this.seats[seat];
      if (sid && !Room.isBotId(sid)) humans += 1;
    }
    return humans;
  }

  /** Build per-viewer game state that hides opponent hands. */
  getClientGameState(viewerSocketId: string): GameState {
    if (!this.gameState) throw new Error('Room not ready');

    const base = this.gameState;
    const handSizes: [number, number, number, number] = [
      base.hands[0]?.length ?? 0,
      base.hands[1]?.length ?? 0,
      base.hands[2]?.length ?? 0,
      base.hands[3]?.length ?? 0,
    ];

    const hiddenHands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const viewerSeat = this.seats.findIndex((s) => s === viewerSocketId) as PlayerIndex;

    if (viewerSeat >= 0) {
      hiddenHands[viewerSeat] = base.hands[viewerSeat];
      if (this.settings.playerCount === 4) {
        const teammate = (viewerSeat ^ 2) as PlayerIndex;
        hiddenHands[teammate] = base.hands[teammate];
      }
    }

    return { ...base, hands: hiddenHands, handSizes };
  }

  /** Convert to a serializable snapshot for clients. */
  toSnapshot(profiles: Map<string, PlayerProfile>): RoomSnapshot {
    const profileMap: Record<string, PlayerProfile> = {};
    for (const sid of this.seats) {
      if (!sid) continue;
      const p = profiles.get(sid);
      if (p) profileMap[sid] = p;
    }
    for (const sid of this.players) {
      const p = profiles.get(sid);
      if (p) profileMap[sid] = p;
    }

    const info: RoomInfo = {
      code: this.code,
      players: this.players,
      seats: this.seats,
      teams: this.teams,
      teamNames: this.teamNames,
      hostId: this.hostId,
      settings: this.settings,
      gameState: this.gameState,
      turn: this.turn,
    };

    return { ...info, profiles: profileMap };
  }

  // ─── Deal / Round ───

  dealInitial(): { state: GameState; remainingDeck: Card[] } {
    const deck = shuffle(createDeck());
    const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const tableCards: Card[] = [];

    for (let r = 0; r < 3; r++) {
      for (const p of this.activeSeats) {
        const c = deck.shift()!;
        hands[p].push(c);
      }
    }
    for (let i = 0; i < 4; i++) {
      tableCards.push(deck.shift()!);
    }

    const state: GameState = {
      tableCards,
      hands,
      capturesByTeam: [[], []],
      scoresByTeam: [0, 0],
      currentPlayerIndex: this.activeSeats[0] ?? 0,
      roundNumber: 1,
      chkobbaByTeam: [0, 0],
    };
    return { state, remainingDeck: deck };
  }

  applyPlay(seatIndex: PlayerIndex, playedCardId: string, combo?: string[]) {
    if (!this.gameState) throw new Error('Room not ready');

    const playedCard = this.gameState.hands[seatIndex]?.find((c) => c.id === playedCardId) || null;
    if (!playedCard) throw new Error('Card not in hand');

    const res = applyMove(this.gameState, seatIndex, playedCardId, combo, this.activeSeats);

    this.gameState.tableCards = res.newTable;
    this.gameState.hands[seatIndex] = res.newHand;
    if (res.captured.length > 0) {
      const team = TEAM_FOR_SEAT[seatIndex];
      this.gameState.capturesByTeam[team].push(...res.captured);

      const isLastCardOfDeal = this.cardsLeftInCurrentDeal === 1;
      if (res.chkobba) {
        const isDealerTurn = seatIndex === this.dealerIndex;
        if (!(isDealerTurn && isLastCardOfDeal)) {
          this.gameState.chkobbaByTeam[team] += 1;
        }
      }
    }
    this.gameState.currentPlayerIndex = res.nextPlayer;
    this.gameState.lastCaptureTeam = res.lastCaptureTeam;

    this.gameState.lastPlay = {
      seatIndex,
      played: playedCard,
      capturedTableCardIds: res.captured.map((c) => c.id).filter((id) => id !== playedCardId),
      t: Date.now(),
    };

    this.cardsLeftInCurrentDeal -= 1;
  }

  /** Deal next 3 cards or end the round. Returns 'dealt' | 'roundEnd'. */
  nextDealOrEndRound(): 'dealt' | 'roundEnd' {
    const cardsPerDeal = this.activeSeats.length * 3;

    if (this.deck.length >= cardsPerDeal) {
      for (let r = 0; r < 3; r++) {
        for (const p of this.activeSeats) {
          this.gameState!.hands[p].push(this.deck.shift()!);
        }
      }
      this.cardsLeftInCurrentDeal = cardsPerDeal;

      const idx = this.activeSeats.indexOf(this.dealerIndex);
      this.dealerIndex = (
        idx >= 0 ? this.activeSeats[(idx + 1) % this.activeSeats.length] : this.activeSeats[0]
      ) as PlayerIndex;
      return 'dealt';
    }

    // End of round
    const lastTeam = this.gameState!.lastCaptureTeam;
    if (lastTeam !== undefined && this.gameState!.tableCards.length > 0) {
      this.gameState!.capturesByTeam[lastTeam].push(...this.gameState!.tableCards);
      this.gameState!.tableCards = [];
    }

    const roundScore = computeRoundScore(
      this.gameState!.capturesByTeam,
      this.gameState!.chkobbaByTeam
    );
    this.gameState!.scoresByTeam = [
      this.gameState!.scoresByTeam[0] + roundScore.teamPoints[0],
      this.gameState!.scoresByTeam[1] + roundScore.teamPoints[1],
    ];

    // Prepare next round state
    const newDeck = shuffle(createDeck());
    const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const tableCards: Card[] = [];
    for (let r = 0; r < 3; r++) {
      for (const p of this.activeSeats) {
        hands[p].push(newDeck.shift()!);
      }
    }
    for (let i = 0; i < 4; i++) {
      tableCards.push(newDeck.shift()!);
    }

    this.pendingNextRound = {
      gameState: {
        tableCards,
        hands,
        capturesByTeam: [[], []],
        scoresByTeam: this.gameState!.scoresByTeam,
        currentPlayerIndex: this.activeSeats[0] ?? 0,
        roundNumber: this.gameState!.roundNumber + 1,
        chkobbaByTeam: [0, 0],
      },
      remainingDeck: newDeck,
      dealerIndex: (this.activeSeats[0] ?? 0) as PlayerIndex,
      cardsLeftInDeal: this.activeSeats.length * 3,
    };

    this.replayVotes = new Set();
    return 'roundEnd';
  }

  /** Returns the round score details (for emission). */
  get roundScoreDetails() {
    if (!this.gameState) return null;
    return computeRoundScore(this.gameState.capturesByTeam, this.gameState.chkobbaByTeam);
  }

  startPendingRound(): boolean {
    if (!this.pendingNextRound) return false;
    this.gameState = this.pendingNextRound.gameState;
    this.deck = this.pendingNextRound.remainingDeck;
    this.dealerIndex = this.pendingNextRound.dealerIndex;
    this.cardsLeftInCurrentDeal = this.pendingNextRound.cardsLeftInDeal;
    this.pendingNextRound = null;
    this.replayVotes = null;
    return true;
  }

  // ─── Timers ───

  clearTimers() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }
    if (this.botActTimeout) {
      clearTimeout(this.botActTimeout);
      this.botActTimeout = null;
    }
    this.turn = undefined;
  }

  clearTurnTimer() {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
      this.turnTimeout = null;
    }
    this.turn = undefined;
  }

  clearBotActTimer() {
    if (this.botActTimeout) {
      clearTimeout(this.botActTimeout);
      this.botActTimeout = null;
    }
  }

  // ─── Static helpers ───

  static isBotId(id: string | null | undefined): id is string {
    return typeof id === 'string' && id.startsWith(Room.BOT_PREFIX);
  }

  static isAllowedSoundboardFile(soundFile: string): boolean {
    return /^[A-Za-z0-9][A-Za-z0-9_.-]*\.(mp3|wav|ogg)$/i.test(soundFile);
  }

  /** Generate a unique room code, checking against existing rooms. */
  static generateUniqueCode(existing: Map<string, unknown>, maxAttempts = 20): string {
    for (let i = 0; i < maxAttempts; i++) {
      const code = Math.random().toString(36).slice(2, 6).toUpperCase();
      if (!existing.has(code)) return code;
    }
    // Fallback: 6-char code for extreme collision scenarios
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}
