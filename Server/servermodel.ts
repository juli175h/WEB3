import { Player } from "../domain/Player";
import * as Game from "../domain/game";
import { v4 as uuid } from "uuid";
import { ServerResponse } from "./response";

/** ----------- TYPES ------------ */
export interface ServerError {
  message: string;
}

export interface PendingGame {
  id: string;
  creator: string;
  players: string[];
  number_of_players: number;
  started: boolean;
  process: (broadcast: (g: IndexedUno | PendingGame) => void) => void;
}

export interface IndexedUno {
  id: string;
  players: Player[];
  state: "PENDING" | "ACTIVE" | "FINISHED";
  currentPlayer?: string;
  topCard?: string;
  process: (broadcast: (g: IndexedUno | PendingGame) => void) => void;
}

export interface GameStore {
  pending: Map<string, PendingGame>;
  active: Map<string, IndexedUno>;
}

/** ----------- STORE ------------ */
export const createGameStore = (): GameStore => ({
  pending: new Map(),
  active: new Map(),
});

/** ----------- MODEL ------------ */
export class ServerModel {
  constructor(private store: GameStore) {}

  async add(creator: string, number_of_players: number): Promise<ServerResponse<IndexedUno | PendingGame, ServerError>> {
    try {
      const id = uuid();
      const pending: PendingGame = {
        id,
        creator,
        players: [creator],
        number_of_players,
        started: false,
        process: broadcast => broadcast(pending),
      };
      this.store.pending.set(id, pending);
      return { ok: true, data: pending };
    } catch (e: any) {
      return { ok: false, error: { message: e.message } };
    }
  }

  async join(id: string, player: string): Promise<ServerResponse<IndexedUno | PendingGame, ServerError>> {
    const pending = this.store.pending.get(id);
    if (!pending) return { ok: false, error: { message: "Game not found" } };

    if (pending.players.includes(player)) {
      return { ok: true, data: pending };
    }

    pending.players.push(player);

    if (pending.players.length >= pending.number_of_players) {
      // start actual game
      const players = pending.players.map(name => new Player(name));
      Game["initializeGame"](players);
      const active: IndexedUno = {
        id: pending.id,
        players,
        state: "ACTIVE",
        currentPlayer: players[0].name,
        topCard: Game["discardPile"]?.top()?.toString?.(),
        process: broadcast => broadcast(active),
      };
      this.store.pending.delete(id);
      this.store.active.set(id, active);
      return { ok: true, data: active };
    }

    return { ok: true, data: pending };
  }

  async play_card(id: string, playerName: string, cardId: string): Promise<ServerResponse<IndexedUno, ServerError>> {
    const active = this.store.active.get(id);
    if (!active) return { ok: false, error: { message: "Game not found" } };

    const player = active.players.find(p => p.name === playerName);
    if (!player) return { ok: false, error: { message: "Player not found" } };

    const card = player.hand.cards.find(c => c.id === cardId);
    if (!card) return { ok: false, error: { message: "Card not found" } };

    try {
      Game["playCard"](player, card);
      active.currentPlayer = Game["currentPlayer"].name;
      active.topCard = Game["discardPile"].top()?.toString?.();
      return { ok: true, data: active };
    } catch (e: any) {
      return { ok: false, error: { message: e.message } };
    }
  }

  async draw_card(id: string, playerName: string): Promise<ServerResponse<IndexedUno, ServerError>> {
    const active = this.store.active.get(id);
    if (!active) return { ok: false, error: { message: "Game not found" } };

    const player = active.players.find(p => p.name === playerName);
    if (!player) return { ok: false, error: { message: "Player not found" } };

    Game["drawCard"](player);
    active.currentPlayer = Game["currentPlayer"].name;
    active.topCard = Game["discardPile"].top()?.toString?.();

    return { ok: true, data: active };
  }

  all_pending_games() {
    return { ok: true, data: Array.from(this.store.pending.values()) };
  }

  all_games() {
    return { ok: true, data: Array.from(this.store.active.values()) };
  }

  pending_game(id: string) {
    const g = this.store.pending.get(id);
    return g ? { ok: true, data: g } : { ok: false, error: { message: "Not found" } };
  }

  game(id: string) {
    const g = this.store.active.get(id);
    return g ? { ok: true, data: g } : { ok: false, error: { message: "Not found" } };
  }
}
