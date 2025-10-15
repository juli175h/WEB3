import { Player } from "../../Domain/src/model/Player";
import * as Game from "../../domain/src/model/game";
import { ServerResponse } from "./response";

/**
 * A lightweight server-side representation of a UNO game session.
 */
export interface IndexedUno {
  id: string;
  state: "PENDING" | "ACTIVE" | "FINISHED";
  players: Player[];
  currentPlayer: string | null;
  topCard: string | null;
}

/**
 * Represents a game waiting for players to join.
 */
export interface PendingGame {
  id: string;
  players: string[];
  number_of_players: number;
}

/**
 * ServerError used in ServerResponse.error()
 */
export interface ServerError {
  message: string;
}

/**
 * Minimal game store interface
 */
export interface GameStore {
  add: (game: IndexedUno) => Promise<void>;
  get: (id: string) => Promise<IndexedUno | undefined>;
  all: () => Promise<IndexedUno[]>;
}

/**
 * ServerModel coordinates domain logic (game.ts) with storage and network.
 */
export class ServerModel {
  private store: GameStore;

  constructor(store: GameStore) {
    this.store = store;
  }

  /**
   * Create a new pending UNO game
   */
  async add(creator: string, number_of_players: number) {
    const id = crypto.randomUUID();
    const player = new Player(0, creator);

    const game: IndexedUno = {
      id,
      state: "PENDING",
      players: [player],
      currentPlayer: null,
      topCard: null,
    };

    await this.store.add(game);
    return ServerResponse.ok<IndexedUno | PendingGame>(game);
  }

  /**
   * Join a pending game.
   * When enough players join (>= 2), the round starts.
   */
  async join(id: string, name: string) {
    const game = await this.store.get(id);
    if (!game) return ServerResponse.error<ServerError>({ message: "Game not found" });

    if (game.state !== "PENDING")
      return ServerResponse.error<ServerError>({ message: "Game already started" });

    const player = new Player(game.players.length, name);
    game.players.push(player);

    // Start automatically if 2+ players joined
    if (game.players.length >= 2) {
      Game["initializeGame"](game.players);
      game.state = "ACTIVE";
      game.currentPlayer = game.players[0].name;
      game.topCard = Game["discardPile"].top()?.type ?? null;
    }

    await this.store.add(game);
    return ServerResponse.ok<IndexedUno | PendingGame>(game);
  }

  /**
   * Play a card
   */
  async play_card(id: string, playerName: string, cardIndex: number) {
    const game = await this.store.get(id);
    if (!game) return ServerResponse.error<ServerError>({ message: "Game not found" });
    if (game.state !== "ACTIVE") return ServerResponse.error<ServerError>({ message: "Game not active" });

    const player = game.players.find(p => p.name === playerName);
    if (!player) return ServerResponse.error<ServerError>({ message: "Player not found" });

    const card = player.hand.cards[cardIndex];
    if (!card) return ServerResponse.error<ServerError>({ message: "Invalid card index" });

    try {
      Game["playCard"](player, card);
      game.currentPlayer = Game["currentPlayer"].name;
      game.topCard = Game["discardPile"].top()?.type ?? null;

      await this.store.add(game);
      return ServerResponse.ok<IndexedUno>(game);
    } catch (err) {
      return ServerResponse.error<ServerError>({ message: (err as Error).message });
    }
  }

  /**
   * Draw a card
   */
  async draw_card(id: string, playerName: string) {
    const game = await this.store.get(id);
    if (!game) return ServerResponse.error<ServerError>({ message: "Game not found" });
    if (game.state !== "ACTIVE") return ServerResponse.error<ServerError>({ message: "Game not active" });

    const player = game.players.find(p => p.name === playerName);
    if (!player) return ServerResponse.error<ServerError>({ message: "Player not found" });

    try {
      Game["drawCard"](player);
      await this.store.add(game);
      return ServerResponse.ok<IndexedUno>(game);
    } catch (err) {
      return ServerResponse.error<ServerError>({ message: (err as Error).message });
    }
  }

  /**
   * Get a single game by ID
   */
  async game(id: string) {
    const game = await this.store.get(id);
    if (!game) return ServerResponse.error<ServerError>({ message: "Game not found" });
    return ServerResponse.ok<IndexedUno>(game);
  }

  /**
   * List all games (any state)
   */
  async all_games() {
    const games = await this.store.all();
    return ServerResponse.ok<IndexedUno[]>(games);
  }

  /**
   * List all games waiting for players
   */
  async all_pending_games() {
    const all = await this.store.all();
    const pending = all.filter(g => g.state === "PENDING");
    return ServerResponse.ok<PendingGame[]>(pending as unknown as PendingGame[]);
  }

  /**
   * Get a single pending game by ID
   */
  async pending_game(id: string) {
    const game = await this.store.get(id);
    if (!game || game.state !== "PENDING")
      return ServerResponse.error<ServerError>({ message: "Pending game not found" });
    return ServerResponse.ok<PendingGame>(game as unknown as PendingGame);
  }
}
