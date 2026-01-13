import type { Card } from "./UnoCard";

export type Player = Readonly<{
  id: number;
  name: string;
  hand: ReadonlyArray<Card>;
  score: number;
}>;

export const createPlayer = (id: number, name: string): Player => ({
  id,
  name,
  hand: [] as ReadonlyArray<Card>,
  score: 0,
});

export const resetHand = (player: Player): Player => ({ ...player, hand: [] as ReadonlyArray<Card> });

export const drawCards = (player: Player, deck: ReadonlyArray<Card>, count = 1): [Player, ReadonlyArray<Card>] => {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return [{ ...player, hand: [...player.hand, ...drawn] }, remaining];
};

export const playCard = (player: Player, card: Card): Player => ({
  ...player,
  hand: player.hand.filter(c => c !== card),
});
