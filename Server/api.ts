import { ServerResponse } from "./response";
import { GameStore, IndexedUno, PendingGame, ServerError } from "./servermodel";
import { ServerModel } from "./servermodel";
import { Broadcaster } from "./types";


export type API = {
  new_game: (creator: string, number_of_players: number) => Promise<ServerResponse<IndexedUno | PendingGame, ServerError>>;
  pending_games: () => Promise<ServerResponse<PendingGame[], ServerError>>;
  pending_game: (id: string) => Promise<ServerResponse<PendingGame, ServerError>>;
  join: (id: string, player: string) => Promise<ServerResponse<IndexedUno | PendingGame, ServerError>>;
  games: () => Promise<ServerResponse<IndexedUno[], ServerError>>;
  game: (id: string) => Promise<ServerResponse<IndexedUno, ServerError>>;
  play_card: (id: string, player: string, cardId: string) => Promise<ServerResponse<IndexedUno, ServerError>>;
  draw_card: (id: string, player: string) => Promise<ServerResponse<IndexedUno, ServerError>>;
};

export const create_api = (broadcaster: Broadcaster, store: GameStore): API => {
  const server = new ServerModel(store);

  async function new_game(creator: string, number_of_players: number) {
    const newGame = await server.add(creator, number_of_players);
    newGame.process(broadcast);
    return newGame;
  }

  async function join(id: string, player: string) {
    const game = await server.join(id, player);
    game.process(broadcast);
    return game;
  }

  async function play_card(id: string, player: string, cardId: string) {
    const game = await server.play_card(id, player, cardId);
    game.process(broadcast);
    return game;
  }

  async function draw_card(id: string, player: string) {
    const game = await server.draw_card(id, player);
    game.process(broadcast);
    return game;
  }

  function pending_games() {
    return server.all_pending_games();
  }

  function pending_game(id: string) {
    return server.pending_game(id);
  }

  async function games() {
    return server.all_games();
  }

  async function game(id: string) {
    return server.game(id);
  }

  async function broadcast(game: IndexedUno | PendingGame): Promise<void> {
    broadcaster.send(game);
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
