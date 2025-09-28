
import type { Card } from "./UnoCard"
import { createEmptyDeck, DrawPile, DiscardPile, Hand } from "./deck"

export class Player {
  readonly id: number
  readonly name: string
  hand: Hand
  score : number

  constructor(id: number, name: string) {
    this.id = id
    this.name = name
    this.score = 0
    this.hand = new Hand(createEmptyDeck().cards)
  }

    resetHand(): void {
    this.hand = new Hand(createEmptyDeck().cards)
  }

  draw(drawPile: DrawPile, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      const card = drawPile.deal()
      if (card) {
        this.hand.add(card)
      }
    }
  }
}