import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { Card, GameState, PlayerIndex, RoomInfo, TEAM_FOR_SEAT, TeamIndex } from "../../../shared/types";
import { createDeck, shuffle } from "./deck";
import { applyMove } from "./rules";

export class GameRoomManager {
  rooms: Map<string, RoomInfo> = new Map();

  constructor(private io: Server) {}

  createRoom(): RoomInfo {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const room: RoomInfo = {
      code,
      players: [],
      seats: [null, null, null, null],
      teams: [[0, 2], [1, 3]],
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, socket: Socket): RoomInfo {
    const room = this.rooms.get(code);
    if (!room) throw new Error("Room not found");
    if (room.players.includes(socket.id)) return room;
    if (room.players.length >= 4) throw new Error("Room full");
    room.players.push(socket.id);
    this.io.socketsJoin(code);

    // assign seat when 4 joined
    if (room.players.length === 4) {
      room.seats = [...room.players];
      this.startGame(room);
    }
    this.io.to(code).emit("room:update", room);
    return room;
  }

  private dealInitial(): GameState {
    const deck = shuffle(createDeck());
    const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
    const tableCards: Card[] = [];

    // deal 3 cards to each player
    for (let r = 0; r < 3; r++) {
      for (let p = 0; p < 4; p++) {
        const c = deck.shift();
        if (!c) throw new Error("Deck exhausted early");
        hands[p].push(c);
      }
    }

    // 4 cards to table
    for (let i = 0; i < 4; i++) {
      const c = deck.shift();
      if (!c) throw new Error("Deck exhausted early");
      tableCards.push(c);
    }

    return {
      tableCards,
      hands,
      capturesByTeam: [[], []],
      scoresByTeam: [0, 0],
      currentPlayerIndex: 0,
      roundNumber: 1,
      chkobbaByTeam: [0, 0],
    };
  }

  private startGame(room: RoomInfo) {
    room.gameState = this.dealInitial();
    this.io.to(room.code).emit("game:start", room.gameState);
  }

  handlePlay(code: string, socketId: string, playedCardId: string, combo?: string[]) {
    const room = this.rooms.get(code);
    if (!room || !room.gameState) throw new Error("Room not ready");
    const seatIndex = room.seats.findIndex((s) => s === socketId) as PlayerIndex;
    if (seatIndex !== room.gameState.currentPlayerIndex) throw new Error("Not your turn");

    const res = applyMove(room.gameState, seatIndex, playedCardId, combo);

    // update server state
    room.gameState.tableCards = res.newTable;
    room.gameState.hands[seatIndex] = res.newHand;
    if (res.captured.length > 0) {
      const team = TEAM_FOR_SEAT[seatIndex];
      room.gameState.capturesByTeam[team].push(...res.captured);
      if (res.chkobba) {
        room.gameState.chkobbaByTeam[team] += 1;
      }
    }
    room.gameState.currentPlayerIndex = res.nextPlayer;
    room.gameState.lastCaptureTeam = res.lastCaptureTeam;

    this.io.to(code).emit("game:update", room.gameState);
  }
}
