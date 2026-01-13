import type { Card, Color } from "./UnoCard";

export type PlayerState = Readonly<{
  id: number;
  name: string;
  score: number;
  hand: ReadonlyArray<Card>;
}>;

export type RoundState = Readonly<{
  currentPlayerIndex: number;
  direction: 1 | -1;
  discard: ReadonlyArray<Card>; // top is last element
  drawPile: ReadonlyArray<Card>;
}>;

export type GameState = Readonly<{
  players: ReadonlyArray<PlayerState>;
  rounds: ReadonlyArray<RoundState>;
  finished: boolean;
  winner?: { id: number; name: string; score: number } | null;
}>;

export type Chosen = Readonly<{ chosenColor?: Color }>;

export function currentRound(g: GameState): RoundState {
  return g.rounds[g.rounds.length - 1];
}

export function withRound(g: GameState, r: RoundState): GameState {
  return { ...g, rounds: [...g.rounds.slice(0, -1), r] } as GameState;
}
