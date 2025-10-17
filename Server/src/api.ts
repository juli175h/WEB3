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
  if ((game as any).pending) {
    console.log("🔁 Broadcasting pending update:", game.id);
    pubsub.publish("PENDING_UPDATED", { pending: game });
  } else {
    console.log("🚀 Broadcasting ACTIVE_UPDATED:", game.id);
    pubsub.publish("ACTIVE_UPDATED", { active: toGraphQLMatch(game as IndexedUnoMatch) });
    pubsub.publish("PENDING_UPDATED", { pending: null }); // notify lobbies
  }
}

  return {
    async new_game(creator, number) {
      const g = await server.add(creator, number);
      await broadcast(g);
      return g;
    },

    // 👇 revised join()
    async join(id, player) {
      const g = await server.join(id, player);

      // If the game is now active (no longer pending)
      if (!("pending" in g && g.pending)) {
        // Notify pending subscribers so they can refresh
        pubsub.publish("PENDING_UPDATED", { pending: null });
        // Notify active subscribers so all clients in this lobby transition
        pubsub.publish("ACTIVE_UPDATED", { active: toGraphQLMatch(g as IndexedUnoMatch) });
      } else {
        await broadcast(g);
      }

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

  // Build a safe round snapshot (tolerant to early initialization)
  const safeRound = round
    ? {
        currentPlayerIndex: round.currentPlayerIndex ?? 0,
        direction: round.playDirection ?? 1,
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
          handCount: match.winner.hand?.length ?? 0,
        }
      : null,
    players: match.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      handCount: p.hand?.length ?? 0,
    })),
    currentRound: safeRound, // can be null briefly; client handles it
  };
}
