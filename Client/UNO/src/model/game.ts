import type { Color, Card } from "../../../../Domain/src/model/UnoCard";

/** ---------------- Uno Game Types ---------------- */

export type PublicPlayer = {
  id: number;
  name: string;
  handCount: number;
};

export type IndexedUno = {
  id: string;
  pending: boolean; // GraphQL sends a boolean
  players: PublicPlayer[];
  currentPlayerIndex: number;
  direction: number;
  discardTop?: Card;
  drawPileCount: number;
};

export type PendingUno = {
  id: string;
  pending: boolean; // changed from literal `true`
  creator: string;
  number_of_players: number;
  players: string[];
};

/** ---------------- Adapters ---------------- */

type GraphQlGame = {
  id: string;
  pending: boolean;
  players: { id: number; name: string; handCount: number }[];
  currentPlayerIndex: number;
  direction: number;
  discardTop?: Card;
  drawPileCount: number;
};

export function from_graphql_game(g: GraphQlGame): IndexedUno {
  return {
    id: g.id,
    pending: g.pending,
    players: g.players,
    currentPlayerIndex: g.currentPlayerIndex,
    direction: g.direction,
    discardTop: g.discardTop,
    drawPileCount: g.drawPileCount,
  };
}
