import type { GameState, PlayerIndex, RoomSettings, RoomSnapshot, Card } from '../types';
import type { SoundboardSoundFile } from '../lib/soundboard';

export type GamePhase = 'idle' | 'lobby' | 'playing' | 'roundEnd';

export type SoundboardEvent = {
  seatIndex: PlayerIndex;
  soundFile: SoundboardSoundFile;
  t: number;
};

export type TurnInfo = { endsAt: number; durationMs: number };

export type RoundResult = { scores: [number, number]; details: unknown };

export type ReplayWaiting = { count: number; total: number };

export type ConnectionSlice = {
  connected: boolean;
  socketId: string | null;
  clockSkewMs: number;
  setConnected: (v: boolean) => void;
  setSocketId: (id: string | null) => void;
  setClockSkew: (ms: number) => void;
};

export type RoomSlice = {
  roomCode: string | null;
  snapshot: RoomSnapshot | null;
  mySeat: PlayerIndex | null;
  phase: GamePhase;
  setRoomCode: (code: string | null) => void;
  setSnapshot: (s: RoomSnapshot | null, mySocketId: string | null) => void;
  setPhase: (p: GamePhase) => void;
  resetRoom: () => void;
};

export type GameSlice = {
  gameState: GameState | null;
  turn: TurnInfo | null;
  lastRound: RoundResult | null;
  replayWaiting: ReplayWaiting | null;
  roundBanner: string | null;
  dealTick: number;
  setGameState: (g: GameState | null) => void;
  setTurn: (t: TurnInfo | null) => void;
  setLastRound: (r: RoundResult | null) => void;
  setReplayWaiting: (r: ReplayWaiting | null) => void;
  setRoundBanner: (s: string | null) => void;
  bumpDealTick: () => void;
};

export type UISlice = {
  selectedHandId: string | null;
  selectedTableIds: string[];
  handGhostIndex: number | null;
  profileModalOpen: boolean;
  legalOpen: boolean;
  legalSection: 'privacy' | 'terms' | 'contact';
  mobileMenuOpen: boolean;
  soundboardOpen: boolean;
  selectHandCard: (id: string | null) => void;
  toggleTableCard: (id: string) => void;
  clearSelection: () => void;
  setHandGhostIndex: (i: number | null) => void;
  setProfileModalOpen: (v: boolean) => void;
  setLegal: (open: boolean, section?: UISlice['legalSection']) => void;
  setMobileMenuOpen: (v: boolean) => void;
  setSoundboardOpen: (v: boolean) => void;
  // Derived selectors live as helper hooks in store/selectors.ts
};

export type AudioSlice = {
  soundboardEvent: SoundboardEvent | null;
  mutedSoundboardSeats: Set<number>;
  speakingSeat: PlayerIndex | null;
  seatBars: Record<number, number[]>;
  setSoundboardEvent: (e: SoundboardEvent | null) => void;
  toggleMutedSeat: (seat: number) => void;
  setSpeakingSeat: (seat: PlayerIndex | null) => void;
  setSeatBars: (seat: number, bars: number[] | null) => void;
};

export type FullStore = ConnectionSlice & RoomSlice & GameSlice & UISlice & AudioSlice;

// Re-exports for convenience
export type { GameState, PlayerIndex, RoomSettings, RoomSnapshot, Card };
