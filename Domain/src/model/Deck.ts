
import { standardShuffler } from "../utils/random_utils"
import type { Card, NumberedCard, WildCard, ReverseCard, SkipCard, DrawTwoCard, WildDrawCard, Color } from "../model/UnoCard"

export const colors: Color[] = ["RED", "BLUE", "GREEN", "YELLOW"]

export interface Deck {
  cards: Card[]
  shuffle: () => void
}

export function createEmptyDeck(): Deck {
  const cards: Card[] = []
  return {
    cards,
    shuffle: () => standardShuffler(cards),
  }
}

export function createInitialDeck(): Deck {
  const cards: Card[] = []

  // Numbered cards
  for (let color of colors) {
    cards.push({ type: "NUMBERED", color, value: 0 } as NumberedCard)
    for (let n = 1; n <= 9; n++) {
      cards.push({ type: "NUMBERED", color, value: n } as NumberedCard)
      cards.push({ type: "NUMBERED", color, value: n } as NumberedCard)
    }
  }

   // Action cards (each has value 20)
  for (let color of colors) {
    cards.push({ type: "SKIP", color, value: 20 } as SkipCard)
    cards.push({ type: "SKIP", color, value: 20 } as SkipCard)
    cards.push({ type: "REVERSE", color, value: 20 } as ReverseCard)
    cards.push({ type: "REVERSE", color, value: 20 } as ReverseCard)
    cards.push({ type: "DRAW", color, value: 20 } as DrawTwoCard)
    cards.push({ type: "DRAW", color, value: 20 } as DrawTwoCard)
  }

    // Wild cards (each has value 50)
  for (let i = 0; i < 4; i++) {
    cards.push({ type: "WILD", value: 50 } as WildCard)
    cards.push({ type: "WILD DRAW", value: 50 } as WildDrawCard)
  }

  return {
    cards,
    shuffle: () => standardShuffler(cards)
  }
}

export class DrawPile implements Deck {
  cards: Card[]

  constructor(cards: Card[]) {
    this.cards = cards
  }

  shuffle() {
    standardShuffler(this.cards)
  }

  deal(): Card | undefined {
    return this.cards.shift()
  }

  get size() {
    return this.cards.length
  }
   add(card: Card) {
    this.cards.push(card)
  }

}

export class Hand implements Deck {
  cards: Card[]
  

  constructor(cards: Card[]) {
    this.cards = cards

    
  }
   get length(): number {
    return this.cards.length
  }

  shuffle() {
    standardShuffler(this.cards)
  }

  add(card: Card) {
    this.cards.push(card)
  }

  play(card: Card) {
    const index = this.cards.indexOf(card)
    if (index !== -1) this.cards.splice(index, 1)
  }

  get size() {
    return this.cards.length
  }
}

export class DiscardPile implements Deck {
  cards: Card[] = []

  shuffle() {
    
  }

  add(card: Card) {
    this.cards.push(card)
  }

  top(): Card | undefined {
    return this.cards[this.cards.length - 1]
  }

  size() {
    return this.cards.length
  }
}
