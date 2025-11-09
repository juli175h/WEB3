import type { Deck } from "./deck";
import  { drawCard } from "./deck";

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

export const drawCards = (player: Player, deck: Deck, count = 1): [Player, Deck] => {
  let newHand = [...player.hand];
  let newDeck = { ...deck };

  for (let i = 0; i < count; i++) {
    const [card, nextDeck] = drawCard(newDeck);
    newDeck = nextDeck;
    if (card) newHand = [...newHand, card];
  }

  return [{ ...player, hand: newHand }, newDeck];
};

export const playCard = (player: Player, card: Card): Player => ({
  ...player,
  hand: player.hand.filter(c => c !== card),
});
