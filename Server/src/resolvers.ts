import { PubSub } from "graphql-subscriptions";
import { API, toGraphQLMatch } from "./api";
import { IndexedUnoMatch, PendingGame } from "./serverModel.fp";
import {Color} from "../../Domain/src/model/UnoCard";

/** Convert a game to GraphQL type */
function mapToGraphQL(game: IndexedUnoMatch | PendingGame) {
  if ("pending" in game && game.pending) return game; // lobby
  return toGraphQLMatch(game as IndexedUnoMatch);      // active
}

export const create_resolvers = (pubsub: PubSub, api: API) => {
  return {
    Query: {
      async games() {
        const res = await api.games();
        return res.map(toGraphQLMatch);
      },
      async game(_: any, { id }: { id: string }) {
        const g = await api.game(id);
        return g ? toGraphQLMatch(g) : null;
      },
      async pending_games() {
        return api.pending_games();
      },
      async pending_game(_: any, { id }: { id: string }) {
        return api.pending_game(id);
      },
      async hand(_: any, { id, player }: { id: string; player: string }) {
        return api.hand(id, player);
      },
    },

    Mutation: {
      async new_game(_: any, { creator, number_of_players }: { creator: string; number_of_players: number }) {
        const game = await api.new_game(creator, number_of_players);
        pubsub.publish("PENDING_UPDATED", { pending: game });
        return game;
      },

      async join(_: any, { id, player }: { id: string; player: string }) {
        const game = await api.join(id, player);
        pubsub.publish(game.pending ? "PENDING_UPDATED" : "ACTIVE_UPDATED", {
          pending: game.pending ? game : undefined,
          active: !game.pending ? toGraphQLMatch(game as IndexedUnoMatch) : undefined,
        });
        return game;
      },

      async draw(_: any, { id, player }: { id: string; player: string }) {
        const g = await api.draw(id, player);
        pubsub.publish("ACTIVE_UPDATED", { active: toGraphQLMatch(g) });
        return g;
      },

      async playCardByIndex(
          _: any,
          { id, player, handIndex, chosenColor }: { id: string; player: string; handIndex: number; chosenColor?: Color }
      ) {
        const g = await api.play(id, player, handIndex, chosenColor);
        pubsub.publish("ACTIVE_UPDATED", { active: toGraphQLMatch(g) });
        return g;
      },
      async skip(_: any, { id, player }: { id: string; player: string }) {
        const g = await api.skip(id, player);
        pubsub.publish("ACTIVE_UPDATED", { active: toGraphQLMatch(g) });
        return g;
      },
    },

    Game: {
      __resolveType(obj: any) {
        return obj.pending ? "PendingGame" : "ActiveMatch";
      },
    },

    // Ensure GraphQL can resolve the concrete card type for unions/interfaces
    AnyCard: {
      __resolveType(obj: any) {
        switch (obj?.type) {
          case "NUMBERED":
            return "NumberedCard";
          case "SKIP":
            return "SkipCard";
          case "REVERSE":
            return "ReverseCard";
          case "DRAW":
            return "DrawTwoCard";
          case "WILD":
            return "WildCard";
          case "WILD DRAW":
            return "WildDrawCard";
          default:
            return null;
        }
      },
    },

    Card: {
      __resolveType(obj: any) {
        switch (obj?.type) {
          case "NUMBERED":
            return "NumberedCard";
          case "SKIP":
            return "SkipCard";
          case "REVERSE":
            return "ReverseCard";
          case "DRAW":
            return "DrawTwoCard";
          case "WILD":
            return "WildCard";
          case "WILD DRAW":
            return "WildDrawCard";
          default:
            return null;
        }
      },
    },

    Subscription: {
      active: {
        subscribe: () => pubsub.asyncIterableIterator(["ACTIVE_UPDATED"]),
      },
      pending: {
        subscribe: () => pubsub.asyncIterableIterator(["PENDING_UPDATED"]),
      },
    },
  };
};
