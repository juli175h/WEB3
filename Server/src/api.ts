// api.ts
import { PubSub } from "graphql-subscriptions";
import { Color } from "../../domain/src/model/UnoCard";
import { ServerModel, IndexedUno, PendingGame } from "./serverModel";

export type API = {
  new_game(creator: string, number_of_players: number): Promise<IndexedUno | PendingGame>;
  pending_games(): Promise<PendingGame[]>;
  pending_game(id: string): Promise<PendingGame | undefined>;
  join(id: string, player: string): Promise<IndexedUno | PendingGame>;
  games(): Promise<IndexedUno[]>;
  game(id: string): Promise<IndexedUno | undefined>;
  draw(id: string, player: string): Promise<IndexedUno>;
  play(id: string, player: string, handIndex: number, chosenColor?: Color): Promise<IndexedUno>;
};

export function create_api(pubsub: PubSub, server: ServerModel): API {
  async function broadcast(game: IndexedUno | PendingGame) {
    if ((game as any).pending) pubsub.publish("PENDING_UPDATED", { pending: game });
    else pubsub.publish("ACTIVE_UPDATED", { active: toGraphQL(game as IndexedUno) });
  }

  const toGraphQL = (g: IndexedUno) => ({
    id: g["id"],
    pending: false,
    players: g.toPublic().players,
    currentPlayerIndex: g.toPublic().currentPlayerIndex,
    direction: g.toPublic().direction,
    discardTop: g.toPublic().discardTop,
    drawPileCount: g.toPublic().drawPileCount,
    me: (_: any, { player }: { player: string }) => g.me(player),
  });

  return {
    async new_game(creator, n) {
      const pg = await server.add(creator, n);
      await broadcast(pg);
      return pg;
    },
    pending_games: () => server.pending_games(),
    pending_game: (id) => server.pending_game(id),
    async join(id, player) {
      const res = await server.join(id, player);
      await broadcast(res as any);
      return res as any;
    },
    games: () => server.games(),
    game: (id) => server.game(id),
    async draw(id, player) {
      const g = await server.draw(id, player);
      await broadcast(g);
      return g;
    },
    async play(id, player, handIndex, chosenColor) {
      const g = await server.play(id, player, handIndex, chosenColor);
      await broadcast(g);
      return g;
    }
  };
}
