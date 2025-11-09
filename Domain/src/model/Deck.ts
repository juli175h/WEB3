import type { Card, Color } from "./UnoCard";
import { standardShuffler } from "../utils/random_utils";

export type Deck = { cards: Card[] };
export const colors: Color[] = ["RED", "BLUE", "GREEN", "YELLOW"];

export const createEmptyDeck = (): Deck => ({ cards: [] });

export const createInitialDeck = (): Deck => {
  const cards: Card[] = [];

  // Numbered cards
  for (const color of colors) {
    cards.push({ type: "NUMBERED", color, value: 0 });
    for (let n = 1; n <= 9; n++) {
      cards.push({
        type: "NUMBERED",
        color,
        value: n as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, // ✅ cast for literal union
      });
      cards.push({
        type: "NUMBERED",
        color,
        value: n as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      });
    }
  }

  // Action cards
  for (const color of colors) {
    ["SKIP", "REVERSE", "DRAW"].forEach((type) => {
      cards.push({ type, color, value: 20 } as Card);
      cards.push({ type, color, value: 20 } as Card);
    });
  }

  // Wild cards
  for (let i = 0; i < 4; i++) {
    cards.push({ type: "WILD", value: 50 } as Card);
    cards.push({ type: "WILD DRAW", value: 50 } as Card);
  }

  // ✅ Shuffle safely and return
  const shuffled = [...cards];
  standardShuffler(shuffled);
  return { cards: shuffled };
};

export const shuffleDeck = (deck: Deck): Deck => {
  const shuffled = [...deck.cards];
  standardShuffler(shuffled);
  return { cards: shuffled };
};

export const drawCard = (deck: Deck): [Card | undefined, Deck] => {
  const [first, ...rest] = deck.cards;
  return [first, { cards: rest }];
};

export const addCard = (deck: Deck, card: Card): Deck => ({
  cards: [...deck.cards, card],
});
