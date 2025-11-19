import { PubSub } from "graphql-subscriptions";
import type { Color } from "../../Domain/src/model/UnoCard";
import { ServerModel, IndexedUnoMatch, PendingGame } from "./serverModel.fp";

export interface API {
  new_game(creator: string, number_of_players: number): Promise<IndexedUnoMatch | PendingGame>;
  join(id: string, player: string): Promise<IndexedUnoMatch | PendingGame>;
  draw(id: string, player: string): Promise<IndexedUnoMatch>;
  play(id: string, player: string, handIndex: number, chosenColor?: Color): Promise<IndexedUnoMatch>;
  games(): Promise<IndexedUnoMatch[]>;
  game(id: string): Promise<IndexedUnoMatch | undefined>;
  pending_games(): Promise<PendingGame[]>;
  pending_game(id: string): Promise<PendingGame | undefined>;
  hand(id: string, player: string): Promise<any[]>;
  skip(id: string, player: string): Promise<IndexedUnoMatch>;
}

export function create_api(pubsub: PubSub, server: ServerModel): API {
  async function broadcast(game: IndexedUnoMatch | PendingGame) {
    if ((game as any).pending) {
      console.log("🔁 Broadcasting pending update:", game.id);
      // ✅ publish wrapped payload as { pending: game }
      console.log("📡 Publishing to PENDING_UPDATED:", JSON.stringify({ pending: game }, null, 2));
      pubsub.publish("PENDING_UPDATED", { pending: game });
    } else {
      console.log("🚀 Broadcasting ACTIVE_UPDATED and PENDING_UPDATED:", game.id);
      const active = toGraphQLMatch(game as IndexedUnoMatch);
      console.log("📡 Publishing to ACTIVE_UPDATED:", JSON.stringify({ active }, null, 2));
      pubsub.publish("ACTIVE_UPDATED", { active });

      // also notify pending subscribers that the lobby is over
      const ended = {
        id: game.id,
        creator: active.players[0]?.name ?? "system",
        number_of_players: active.players.length,
        players: active.players.map((p) => p.name),
        pending: false,
      };
      console.log("📡 Publishing to PENDING_UPDATED (ended):", JSON.stringify({ pending: ended }, null, 2));
      pubsub.publish("PENDING_UPDATED", { pending: ended });
    }
  }

  return {
    async new_game(creator, number) {
      const g = await server.add(creator, number);
      await broadcast(g);
      return g;
    },

    async join(id, player) {
      const g = await server.join(id, player);

      if (!("pending" in g && g.pending)) {
        const active = toGraphQLMatch(g as IndexedUnoMatch);

        console.log("🔔 Publishing pending=false:", g.id);
        console.log("📡 Publishing to ACTIVE_UPDATED:", JSON.stringify({ active }, null, 2));
        pubsub.publish("ACTIVE_UPDATED", { active });

        const ended = {
          id: g.id,
          creator: active.players[0]?.name ?? "system",
          number_of_players: active.players.length,
          players: active.players.map((p) => p.name),
          pending: false,
        };
        console.log("📡 Publishing to PENDING_UPDATED (ended):", JSON.stringify({ pending: ended }, null, 2));
        pubsub.publish("PENDING_UPDATED", { pending: ended });
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

    async skip(id: string, player: string) {
      const g = await server.skip(id, player);
      await broadcast(g);
      return g;
    },

    games: () => server.games(),
    game: (id) => server.game(id),
    pending_games: () => server.pending_games(),
    pending_game: (id) => server.pending_game(id),
    async hand(id: string, player: string) {
      const match = await server.game(id)
      if (!match) throw new Error('Match not found')
      const p = match.players.find((x) => x.name === player)
      if (!p) throw new Error('Player not found')
      return p.hand.cards
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
