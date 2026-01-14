export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "Q" | "J" | "K";

export interface Card {
  id: string; // unique id per card instance
  suit: Suit;
  rank: Rank;
  value: number; // A=1, 2-7, Q=8, J=9, K=10
}

export type PlayerIndex = 0 | 1 | 2 | 3;
export type TeamIndex = 0 | 1; // 0: players 0 & 2, 1: players 1 & 3

export type RoomMode = '1v1' | 'teams';

export interface RoomSettings {
  mode: RoomMode;
  playerCount: 2 | 4;
  turnTimerEnabled?: boolean;
  turnDurationMs: number;
  fillWithBots?: boolean;
}

export interface GameState {
  tableCards: Card[];
  hands: [Card[], Card[], Card[], Card[]];
  // Optional: server may include sizes even when hiding cards from some seats.
  handSizes?: [number, number, number, number];
  capturesByTeam: [Card[], Card[]];
  scoresByTeam: [number, number];
  currentPlayerIndex: PlayerIndex;
  roundNumber: number;
  chkobbaByTeam: [number, number];
  lastCaptureTeam?: TeamIndex;

  // Public move metadata for UI animations (does not reveal remaining hidden hands).
  lastPlay?: {
    seatIndex: PlayerIndex;
    played: Card;
    capturedTableCardIds: string[]; // ids removed from table (excludes the played card id)
    t: number; // epoch ms
  };
}

export interface TurnInfo {
  endsAt: number; // epoch ms
  durationMs: number;
}

export interface RoomInfo {
  code: string;
  players: string[]; // socket ids
  seats: (string | null)[]; // length 4, socket ids mapped to seats
  teams: [[PlayerIndex, PlayerIndex], [PlayerIndex, PlayerIndex]];
  teamNames?: [string, string];
  hostId?: string; // socket id of host
  settings?: RoomSettings;
  gameState?: GameState;
  turn?: TurnInfo;
}

export interface PlayerProfile {
  socketId: string;
  nickname: string;
  avatar: string; // path to avatar asset
}

export interface RoomSnapshot extends RoomInfo {
  profiles: Record<string, PlayerProfile>; // by socketId
}

export interface PlayCardPayload {
  cardId: string;
  chosenCombinationIds?: string[]; // card ids on table chosen to capture
}

export const TEAM_FOR_SEAT: Record<PlayerIndex, TeamIndex> = {
  0: 0,
  1: 1,
  2: 0,
  3: 1,
};
