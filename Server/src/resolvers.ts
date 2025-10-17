import { PubSub } from "graphql-subscriptions";
import { API, toGraphQLMatch } from "./api";

export function create_resolvers(pubsub: PubSub, api: API) {
  return {
    Query: {
      games: async () => (await api.games()).map(toGraphQLMatch),
      game: async (_: any, { id }: { id: string }) => {
        const g = await api.game(id);
        return g ? toGraphQLMatch(g) : null;
      },
      pending_games: () => api.pending_games(),
      pending_game: (_: any, { id }: { id: string }) => api.pending_game(id),
    },
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

    Game: {
      __resolveType(obj: any) {
        return obj.pending ? "PendingGame" : "ActiveMatch";
      },
    },

   Subscription: {
  active: {
    subscribe: () => (pubsub as any).asyncIterator(["ACTIVE_UPDATED"]),
  },
  pending: {
    subscribe: () => (pubsub as any).asyncIterator(["PENDING_UPDATED"]),
  },
},
  };
}
