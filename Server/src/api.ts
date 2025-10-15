import { ServerResponse } from "./response";
import { GameStore, IndexedUno, PendingGame, ServerError } from "./serverModel";
import { ServerModel } from "./serverModel";
import { Broadcaster } from "./broadcaster";


export type API = {
  new_game: (creator: string, number_of_players: number) => Promise<ServerResponse<IndexedUno | PendingGame, ServerError>>;
  pending_games: () => Promise<ServerResponse<PendingGame[], ServerError>>;
  pending_game: (id: string) => Promise<ServerResponse<PendingGame, ServerError>>;
  join: (id: string, player: string) => Promise<ServerResponse<IndexedUno | PendingGame, ServerError>>;
  games: () => Promise<ServerResponse<IndexedUno[], ServerError>>;
  game: (id: string) => Promise<ServerResponse<IndexedUno, ServerError>>;
  play_card: (id: string, player: string, cardIndex: number) => Promise<ServerResponse<IndexedUno, ServerError>>;
  draw_card: (id: string, player: string) => Promise<ServerResponse<IndexedUno, ServerError>>;
};

/**
 * Factory function to create the UNO API instance.
 * @param broadcaster Sends updates to all connected clients.
 * @param store Game storage implementation (in-memory or database-backed).
 */
export const create_api = (broadcaster: Broadcaster, store: GameStore): API => {
  const server = new ServerModel(store);

  // Create new pending UNO game
  async function new_game(creator: string, number_of_players: number) {
    const newGame = await server.add(creator, number_of_players);
    await newGame.process(broadcast);
    return newGame;
  }

  // List all active or finished games
  async function games() {
    return server.all_games();
  }

  // Get a specific game by ID
  async function game(id: string) {
    return server.game(id);
  }

  // List pending games waiting for players
  async function pending_games() {
    return server.all_pending_games();
  }

  // Get a specific pending game
  async function pending_game(id: string) {
    return server.pending_game(id);
  }

  // Join an existing pending game
  async function join(id: string, player: string) {
    const joined = await server.join(id, player);
    await joined.process(broadcast);
    return joined;
  }

  // Play a card
  async function play_card(id: string, player: string, cardIndex: number) {
    const game = await server.play_card(id, player, cardIndex);
    await game.process(broadcast);
    return game;
  }

  // Draw a card
  async function draw_card(id: string, player: string) {
    const game = await server.draw_card(id, player);
    await game.process(broadcast);
    return game;
  }

  // Broadcast helper
  async function broadcast(game: IndexedUno | PendingGame): Promise<void> {
    await broadcaster.send(game);
  }

  return {
    new_game,
    pending_games,
    pending_game,
    join,
    games,
    game,
    play_card,
    draw_card,
  };
};
