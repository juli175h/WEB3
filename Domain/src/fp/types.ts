import type { Card, Color } from "../model/UnoCard";

export type PlayerState = {
  id: number;
  name: string;
  score: number;
  hand: Card[];
};

export type RoundState = {
  currentPlayerIndex: number;
  direction: 1 | -1;
  discard: Card[]; // top is last element
  drawPile: Card[];
};

export type GameState = {
  players: PlayerState[];
  rounds: RoundState[];
  finished: boolean;
  winner?: { id: number; name: string; score: number } | null;
};

export type Chosen = { chosenColor?: Color };

export function currentRound(g: GameState): RoundState {
  return g.rounds[g.rounds.length - 1];
}

export function withRound(g: GameState, r: RoundState): GameState {
  const next = { ...g, rounds: g.rounds.slice() };
  next.rounds[next.rounds.length - 1] = r;
  return next;
}
