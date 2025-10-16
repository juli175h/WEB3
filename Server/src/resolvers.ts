import { PubSub } from "graphql-subscriptions";
import { API } from "./api";

/**
 * Converts the internal Uno game object into a GraphQL-compatible shape.
 */
function toGraphQLGame(g: any) {
  const pub = g.toPublic();
  return {
    id: g.id,
    pending: false,
    players: pub.players,
    currentPlayerIndex: pub.currentPlayerIndex,
    direction: pub.direction,
    discardTop: pub.discardTop,
    drawPileCount: pub.drawPileCount,
    me: (_: any, { player }: { player: string }) => g.me(player),
  };
}

/**
 * Creates the GraphQL resolver map.
 */
export function create_resolvers(pubsub: PubSub, api: API) {
  return {
    // === CARD UNION & INTERFACE RESOLVERS ===
    AnyCard: {
      __resolveType(obj: any) {
        switch (obj.type) {
          case "NUMBERED": return "NumberedCard";
          case "SKIP": return "SkipCard";
          case "REVERSE": return "ReverseCard";
          case "DRAW": return "DrawTwoCard";
          case "WILD": return "WildCard";
          case "WILD DRAW": return "WildDrawCard";
          default: return null;
        }
      }
    },

    // === ROOT QUERIES ===
    Query: {
      games: async () => (await api.games()).map(toGraphQLGame),
      game: async (_: any, { id }: { id: string }) => {
        const g = await api.game(id);
        return g ? toGraphQLGame(g) : null;
      },
      pending_games: () => api.pending_games(),
      pending_game: (_: any, { id }: { id: string }) => api.pending_game(id),
    },

    // === MUTATIONS ===
    Mutation: {
      new_game: (_: any, args: { creator: string; number_of_players: number }) =>
        api.new_game(args.creator, args.number_of_players),

      join: (_: any, args: { id: string; player: string }) =>
        api.join(args.id, args.player),

      draw: (_: any, args: { id: string; player: string }) =>
        api.draw(args.id, args.player),

      playCardByIndex: (
        _: any,
        args: { id: string; player: string; handIndex: number; chosenColor?: any }
      ) => api.play(args.id, args.player, args.handIndex, args.chosenColor),
    },

    // === UNION & INTERFACE TYPE RESOLVERS ===
    Game: {
      __resolveType(obj: any) {
        return obj.pending ? "PendingGame" : "ActiveGame";
      },
    },

    // === SUBSCRIPTIONS ===
    Subscription: {
      active: {
        subscribe: () => pubsub.asyncIterableIterator(["ACTIVE_UPDATED"]),
      },
      pending: {
        subscribe: () => pubsub.asyncIterableIterator(["PENDING_UPDATED"]),
      },
    },
  };
}
