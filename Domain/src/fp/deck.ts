import { standardShuffler } from "../utils/random_utils";
import type { Card, NumberedCard, ReverseCard, SkipCard, DrawTwoCard, WildCard, WildDrawCard, Color } from "../model/UnoCard";

export const colors: Color[] = ["RED", "BLUE", "GREEN", "YELLOW"];

export function createInitialDeck(): Card[] {
  const cards: Card[] = [];
  for (const color of colors) {
    cards.push({ type: "NUMBERED", color, value: 0 } as NumberedCard);
    for (let n = 1; n <= 9; n++) {
      cards.push({ type: "NUMBERED", color, value: n } as NumberedCard);
      cards.push({ type: "NUMBERED", color, value: n } as NumberedCard);
    }
  }
  for (const color of colors) {
    cards.push({ type: "SKIP", color, value: 20 } as SkipCard);
    cards.push({ type: "SKIP", color, value: 20 } as SkipCard);
    cards.push({ type: "REVERSE", color, value: 20 } as ReverseCard);
    cards.push({ type: "REVERSE", color, value: 20 } as ReverseCard);
    cards.push({ type: "DRAW", color, value: 20 } as DrawTwoCard);
    cards.push({ type: "DRAW", color, value: 20 } as DrawTwoCard);
  }
  for (let i = 0; i < 4; i++) {
    cards.push({ type: "WILD", value: 50 } as WildCard);
    cards.push({ type: "WILD DRAW", value: 50 } as WildDrawCard);
  }
  return cards;
}

export function shuffle(cards: Card[]): Card[] {
  const copy = cards.slice();
  standardShuffler(copy);
  return copy;
}

export function deal<T>(arr: T[], count: number): [T[], T[]] {
  const hand = arr.slice(0, count);
  const rest = arr.slice(count);
  return [hand, rest];
}
