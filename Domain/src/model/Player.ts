import type { Card } from "./UnoCard";

export type Player = {
  id: number;
  name: string;
  hand: Card[];
  score: number;
};

export const createPlayer = (id: number, name: string): Player => ({
  id,
  name,
  hand: [],
  score: 0,
});

export const resetHand = (player: Player): Player => ({ ...player, hand: [] });

export const drawCards = (player: Player, deck: Card[], count = 1): [Player, Card[]] => {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return [{ ...player, hand: [...player.hand, ...drawn] }, remaining];
};

export const playCard = (player: Player, card: Card): Player => ({
  ...player,
  hand: player.hand.filter(c => c !== card),
});
