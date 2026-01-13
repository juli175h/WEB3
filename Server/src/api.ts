import type { Color } from "../../Domain/src/model/UnoCard.js";
import { ServerModel, IndexedUnoMatch, PendingGame } from "./serverModel.fp.js";

export interface API {
  new_game(creator: string, number_of_players: number): Promise<IndexedUnoMatch | PendingGame>;
  join(id: string, player: string): Promise<IndexedUnoMatch | PendingGame>;
  draw(id: string, player: string): Promise<IndexedUnoMatch>;
  play(id: string, player: string, handIndex: number, chosenColor?: Color): Promise<IndexedUnoMatch>;
  games(): Promise<IndexedUnoMatch[]>;
  game(id: string): Promise<IndexedUnoMatch | undefined>;
  pending_games(): Promise<PendingGame[]>;
  pending_game(id: string): Promise<PendingGame | undefined>;
  hand(id: string, player: string): Promise<ReadonlyArray<any>>;
  skip(id: string, player: string): Promise<IndexedUnoMatch>;
}

export interface Broadcaster {
  broadcast(game: IndexedUnoMatch | PendingGame): Promise<void>;
}

export function create_api(broadcaster: Broadcaster, server: ServerModel): API {
  return {
    async new_game(creator, number) {
      const g = await server.add(creator, number);
      await broadcaster.broadcast(g);
      return g;
    },

    async join(id, player) {
      const g = await server.join(id, player);
      await broadcaster.broadcast(g);
      return g;
    },

    async draw(id, player) {
      const g = await server.draw(id, player);
      await broadcaster.broadcast(g);
      return g;
    },

    async play(id, player, handIndex, chosenColor) {
      const g = await server.play(id, player, handIndex, chosenColor);
      await broadcaster.broadcast(g);
      return g;
    },

    async skip(id: string, player: string) {
      const g = await server.skip(id, player);
      await broadcaster.broadcast(g);
      return g;
    },

    games: () => server.games(),
    game: (id) => server.game(id),
    pending_games: () => server.pending_games(),
    pending_game: (id) => server.pending_game(id),
    async hand(id: string, player: string) {
      const match = await server.game(id);
      if (!match) throw new Error("Match not found");
      const p = match.players.find((x) => x.name === player);
      if (!p) throw new Error("Player not found");
      return p.hand.cards;
    },
  };
}

// helper for broadcast and resolver output
export function toGraphQLMatch(match: IndexedUnoMatch) {
  const round = match.currentRound;
  const safeRound = round
    ? {
        currentPlayerIndex: round.currentPlayerIndex ?? 0,
        direction: round.playDirection ?? 1,
        roundIndex: round.roundIndex ?? 0,
        discardTop: round.discardPile?.top?.() ?? null,
        drawPileCount: round.drawPile?.size ?? 0,
      }
    : null;

  return {
    id: match.id,
    pending: false,
    finished: match.finished,
    winner: match.winner
      ? {
          id: match.winner.id,
          name: match.winner.name,
          score: match.winner.score,
          // FP wrapper stores full players; find the player's hand length from players array
          handCount: match.players.find((pp) => pp.id === match.winner!.id)?.hand?.length ?? 0,
        }
      : null,
    // make player id unique per match to avoid client-side cache/entity collisions
    players: match.players.map((p) => ({
      id: `${match.id}-${p.id}`,
      name: p.name,
      score: p.score,
      handCount: p.hand?.length ?? 0,
    })),
    currentRound: safeRound,
  };
}
