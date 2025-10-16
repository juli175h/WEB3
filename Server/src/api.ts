import { PubSub } from "graphql-subscriptions";
import type { Color } from "../../Domain/src/model/UnoCard";
import { ServerModel, IndexedUnoMatch, PendingGame } from "./serverModel";

export interface API {
  new_game(creator: string, number_of_players: number): Promise<IndexedUnoMatch | PendingGame>;
  join(id: string, player: string): Promise<IndexedUnoMatch | PendingGame>;
  draw(id: string, player: string): Promise<IndexedUnoMatch>;
  play(id: string, player: string, handIndex: number, chosenColor?: Color): Promise<IndexedUnoMatch>;
  games(): Promise<IndexedUnoMatch[]>;
  game(id: string): Promise<IndexedUnoMatch | undefined>;
  pending_games(): Promise<PendingGame[]>;
  pending_game(id: string): Promise<PendingGame | undefined>;
}

export function create_api(pubsub: PubSub, server: ServerModel): API {
  async function broadcast(game: IndexedUnoMatch | PendingGame) {
    if ((game as any).pending) pubsub.publish("PENDING_UPDATED", { pending: game });
    else pubsub.publish("ACTIVE_UPDATED", { active: toGraphQLMatch(game as IndexedUnoMatch) });
  }

  return {
    async new_game(creator, number) {
      const g = await server.add(creator, number);
      await broadcast(g);
      return g;
    },
    async join(id, player) {
      const g = await server.join(id, player);
      await broadcast(g);
      return g;
    },
    async draw(id, player) {
      const g = await server.draw(id, player);
      await broadcast(g);
      return g;
    },
    async play(id, player, handIndex, chosenColor) {
      const g = await server.play(id, player, handIndex, chosenColor);
      await broadcast(g);
      return g;
    },
    games: () => server.games(),
    game: (id) => server.game(id),
    pending_games: () => server.pending_games(),
    pending_game: (id) => server.pending_game(id),
  };
}

// helper for broadcast and resolver output
export function toGraphQLMatch(match: IndexedUnoMatch) {
  const round = match.currentRound;
  return {
    id: match.id,
    pending: false,
    finished: match.finished,
    winner: match.winner
      ? {
          id: match.winner.id,
          name: match.winner.name,
          score: match.winner.score,
          handCount: match.winner.hand.length,
        }
      : null,
    players: match.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      handCount: p.hand.length,
    })),
    currentRound: {
      currentPlayerIndex: round.currentPlayerIndex,
      direction: round.playDirection,
      discardTop: round.discardPile.top(),
      drawPileCount: round.drawPile.size,
    },
  };
}
