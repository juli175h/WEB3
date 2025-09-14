import { createInitialDeck, DrawPile, DiscardPile } from "./model/deck"
import { Player } from "./model/Player"
import { Card } from "./model/UnoCard"

const drawPile = new DrawPile(createInitialDeck().cards)
const discardPile = new DiscardPile()
drawPile.shuffle()

const player1 = new Player(1,"Maja")



console.log("DrawPile size:", drawPile.size)
player1.draw(drawPile,7)
console.log(player1.hand)
console.log("DrawPile size:", drawPile.size)
const card = drawPile.deal();
if (card) {
  discardPile.add(card);
}
console.log("Top of discard pile: ")
console.log(discardPile.top())
console.log("DrawPile size:", drawPile.size)


