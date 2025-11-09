import type { Color, Card } from "Domain/src/model/UnoCard";

/** ---------------- Uno Game Types ---------------- */

export type PublicPlayer = {
  id: number | string;
  name: string;
  score: number;
  handCount: number;
};

export type IndexedUno = {
  id: string;
  pending: boolean;
  finished: boolean;
  winner?: PublicPlayer | null;
  players: PublicPlayer[];
  currentRound: {
    currentPlayerIndex: number;
    direction: number;
    discardTop?: Card;
    drawPileCount: number;
  };
};

export type PendingUno = {
  id: string;
  pending: boolean;
  creator: string;
  number_of_players: number;
  players: string[];
};

/** ---------------- Adapters ---------------- */

type GraphQlGame = {
  id: string;
  pending: boolean;
  finished: boolean;
  winner?: PublicPlayer | null;
  players: PublicPlayer[];
  currentRound: {
    currentPlayerIndex: number;
    direction: number;
    discardTop?: Card;
    drawPileCount: number;
  };
};

export function from_graphql_game(g: GraphQlGame): IndexedUno {
  return {
    id: g.id,
    pending: g.pending,
    finished: g.finished,
    winner: g.winner,
    players: g.players,
    currentRound: g.currentRound,
  };
}
