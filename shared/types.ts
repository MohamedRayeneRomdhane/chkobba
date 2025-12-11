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

export interface GameState {
  tableCards: Card[];
  hands: [Card[], Card[], Card[], Card[]];
  capturesByTeam: [Card[], Card[]];
  scoresByTeam: [number, number];
  currentPlayerIndex: PlayerIndex;
  roundNumber: number;
  chkobbaByTeam: [number, number];
  lastCaptureTeam?: TeamIndex;
}

export interface RoomInfo {
  code: string;
  players: string[]; // socket ids
  seats: (string | null)[]; // length 4, socket ids mapped to seats
  teams: [[PlayerIndex, PlayerIndex], [PlayerIndex, PlayerIndex]];
  gameState?: GameState;
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
