import type {
  GameState,
  PlayerIndex,
  RoomSettings,
  RoomSnapshot,
  RoundScoreDetails,
} from './types';

export type SoundboardSoundFile = string;

export type ServerToClient = {
  'room:update': (snap: RoomSnapshot) => void;
  'room:snapshot': (snap: RoomSnapshot) => void;
  'room:closed': (payload: { code: string }) => void;
  'game:start': (state: GameState) => void;
  'game:update': (state: GameState) => void;
  'game:turnTimer': (payload: {
    currentPlayerIndex: PlayerIndex;
    endsAt: number;
    durationMs: number;
    serverNow?: number;
  }) => void;
  'game:roundEnd': (payload: {
    scores: [number, number];
    details?: RoundScoreDetails;
  }) => void;
  'game:replayStatus': (payload: { count: number; total: number }) => void;
  'game:soundboard': (payload: {
    seatIndex: PlayerIndex;
    soundFile: SoundboardSoundFile;
  }) => void;
};

export type Ack<T = unknown> = (ok: boolean, msg?: string, data?: T) => void;

export type ClientToServer = {
  'room:join': (code: string, ack: Ack) => void;
  'room:quit': (payload: { code: string }, ack: Ack) => void;
  'room:settings': (
    payload: { code: string; settings: Partial<RoomSettings> },
    ack: Ack
  ) => void;
  'game:launch': (payload: { code: string }, ack: Ack) => void;
  'game:play': (
    payload: { code: string; cardId: string; combo?: string[] },
    ack: Ack
  ) => void;
  'game:replay': (payload: { code: string }, ack: Ack) => void;
  'game:soundboard': (
    payload: { code: string; soundFile: SoundboardSoundFile },
    ack: Ack
  ) => void;
  'profile:set': (
    payload: { nickname?: string; avatar?: string },
    ack: Ack
  ) => void;
  'team:rename': (
    payload: { code: string; teamIndex: 0 | 1; name: string },
    ack: Ack
  ) => void;
};
