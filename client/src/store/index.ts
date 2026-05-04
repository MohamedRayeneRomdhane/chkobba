import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  AudioSlice,
  ConnectionSlice,
  FullStore,
  GameSlice,
  RoomSlice,
  UISlice,
} from './types';

const connectionSlice = (
  set: (fn: (s: FullStore) => Partial<FullStore>) => void
): ConnectionSlice => ({
  connected: false,
  socketId: null,
  clockSkewMs: 0,
  setConnected: (v) => set(() => ({ connected: v })),
  setSocketId: (id) => set(() => ({ socketId: id })),
  setClockSkew: (ms) => set(() => ({ clockSkewMs: ms })),
});

const roomSlice = (set: (fn: (s: FullStore) => Partial<FullStore>) => void): RoomSlice => ({
  roomCode: null,
  snapshot: null,
  mySeat: null,
  phase: 'idle',
  setRoomCode: (code) => set(() => ({ roomCode: code, phase: code ? 'lobby' : 'idle' })),
  setSnapshot: (snap, mySocketId) =>
    set(() => {
      const idx = snap && mySocketId ? snap.seats?.findIndex((s) => s === mySocketId) : -1;
      return {
        snapshot: snap,
        mySeat: idx != null && idx >= 0 ? (idx as RoomSlice['mySeat']) : null,
      };
    }),
  setPhase: (p) => set(() => ({ phase: p })),
  resetRoom: () =>
    set(() => ({
      roomCode: null,
      snapshot: null,
      mySeat: null,
      phase: 'idle',
      gameState: null,
      turn: null,
      lastRound: null,
      replayWaiting: null,
      roundBanner: null,
    })),
});

const gameSlice = (set: (fn: (s: FullStore) => Partial<FullStore>) => void): GameSlice => ({
  gameState: null,
  turn: null,
  lastRound: null,
  replayWaiting: null,
  roundBanner: null,
  dealTick: 0,
  setGameState: (g) =>
    set((s) => ({
      gameState: g,
      phase: g ? 'playing' : s.phase === 'playing' ? 'lobby' : s.phase,
    })),
  setTurn: (t) => set(() => ({ turn: t })),
  setLastRound: (r) => set(() => ({ lastRound: r, phase: r ? 'roundEnd' : 'playing' })),
  setReplayWaiting: (r) => set(() => ({ replayWaiting: r })),
  setRoundBanner: (s) => set(() => ({ roundBanner: s })),
  bumpDealTick: () => set((s) => ({ dealTick: s.dealTick + 1 })),
});

const uiSlice = (set: (fn: (s: FullStore) => Partial<FullStore>) => void): UISlice => ({
  selectedHandId: null,
  selectedTableIds: [],
  handGhostIndex: null,
  profileModalOpen: false,
  legalOpen: false,
  legalSection: 'privacy',
  mobileMenuOpen: false,
  soundboardOpen: false,
  selectHandCard: (id) =>
    set((s) => ({
      selectedHandId: s.selectedHandId === id ? null : id,
    })),
  toggleTableCard: (id) =>
    set((s) => ({
      selectedTableIds: s.selectedTableIds.includes(id)
        ? s.selectedTableIds.filter((x) => x !== id)
        : [...s.selectedTableIds, id],
    })),
  clearSelection: () => set(() => ({ selectedHandId: null, selectedTableIds: [] })),
  setHandGhostIndex: (i) => set(() => ({ handGhostIndex: i })),
  setProfileModalOpen: (v) => set(() => ({ profileModalOpen: v })),
  setLegal: (open, section) =>
    set((s) => ({
      legalOpen: open,
      legalSection: section ?? s.legalSection,
    })),
  setMobileMenuOpen: (v) => set(() => ({ mobileMenuOpen: v })),
  setSoundboardOpen: (v) => set(() => ({ soundboardOpen: v })),
});

const audioSlice = (set: (fn: (s: FullStore) => Partial<FullStore>) => void): AudioSlice => ({
  soundboardEvent: null,
  mutedSoundboardSeats: new Set<number>(),
  speakingSeat: null,
  seatBars: {},
  setSoundboardEvent: (e) => set(() => ({ soundboardEvent: e })),
  toggleMutedSeat: (seat) =>
    set((s) => {
      const next = new Set(s.mutedSoundboardSeats);
      if (next.has(seat)) next.delete(seat);
      else next.add(seat);
      return { mutedSoundboardSeats: next };
    }),
  setSpeakingSeat: (seat) => set(() => ({ speakingSeat: seat })),
  setSeatBars: (seat, bars) =>
    set((s) => {
      const next = { ...s.seatBars };
      if (bars == null) delete next[seat];
      else next[seat] = bars;
      return { seatBars: next };
    }),
});

export const useGameStore = create<FullStore>((set) => ({
  ...connectionSlice(set),
  ...roomSlice(set),
  ...gameSlice(set),
  ...uiSlice(set),
  ...audioSlice(set),
}));

export { useShallow };
