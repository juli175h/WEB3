import { createInitialDeck, DrawPile, DiscardPile } from "./deck"
import { Player } from "./Player"
import { Card } from "./UnoCard"

let drawPile: DrawPile
let discardPile: DiscardPile
let players: Player[]
let currentPlayer: Player


function initializeGame(initialPlayers: Player[]): void {
  players = initialPlayers
  drawPile = new DrawPile(createInitialDeck().cards)
  discardPile = new DiscardPile()
  drawPile.shuffle()

  players.forEach(player => {
    player.draw(drawPile, 7)
  });

 

  //deal first card
  const card = drawPile.deal();
if (card) {
  discardPile.add(card);
}

 currentPlayer = players[0]

}


function Round(){
    
}


function IsLegalCard(playerCard:Card, topCard:Card){
     // Wild cards are always legal
  if (playerCard.type === "WILD" || playerCard.type === "WILD DRAW") {
    return true;
  }

  // If both cards are the same type
  if (playerCard.type === topCard.type) {
    // Numbered cards must also match color or number
    if (playerCard.type === "NUMBERED" && topCard.type === "NUMBERED") {
      return playerCard.color === topCard.color || playerCard.value === topCard.value;
    }
    // Skip, Reverse, DrawTwo 
    return true;
  }

  // Otherwise, matching color is legal
  if ("color" in playerCard && "color" in topCard && playerCard.color === topCard.color) {
    return true;
  }

  // No match
  return false;
}