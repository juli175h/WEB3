import { createInitialDeck, DrawPile, DiscardPile } from "./deck"
import { Player } from "./Player"
import { Card } from "./UnoCard"

let drawPile: DrawPile
let discardPile: DiscardPile
let players: Player[]
let currentPlayer: Player

let currentPlayerIndex = 0
let playDirection = 1 // 1 = clockwise, -1 = counter-clockwise

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



function nextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + playDirection + players.length) % players.length
  currentPlayer = players[currentPlayerIndex]
}

function applyCardEffect(card: Card) {
  switch(card.type) {
    case "SKIP":
      nextPlayer() // skip the next player
      break
    case "REVERSE":
      playDirection *= -1
      break
    case "DRAW":
      nextPlayer()
      currentPlayer.draw(drawPile, 2)
      break
    case "WILD DRAW":
      nextPlayer()
      currentPlayer.draw(drawPile, 4)
      break
    case "WILD":
      // optionally handle color choice logic
      break
  }
}

function playCard(player: Player, card: Card) {
  if (!IsLegalCard(card, discardPile.top())) {
    throw new Error("Illegal move")
  }

  // Remove card from player's hand
  player.playCard(card)
  // Place card on discard pile
  discardPile.add(card)
  // Apply effects
  applyCardEffect(card)
  // Move to next player
  nextPlayer()
}

function drawCard(player: Player) {
  const card = drawPile.deal()
  if (card) {
    player.hand.push(card)
  }
}

// Main game loop for a round
function Round() {
  while (!isGameOver()) {
    console.log(`Current Player: ${currentPlayer.name}`)
    const playableCard = currentPlayer.hand.find(c => IsLegalCard(c, discardPile.topCard()))
    
    if (playableCard) {
      playCard(currentPlayer, playableCard)
    } else {
      drawCard(currentPlayer)
      // optional: allow player to play drawn card immediately
      const newCard = currentPlayer.hand[currentPlayer.hand.length - 1]
      if (IsLegalCard(newCard, discardPile.topCard())) {
        playCard(currentPlayer, newCard)
      } else {
        nextPlayer()
      }
    }
  }

  announceWinner()
}

function isGameOver(): boolean {
  return players.some(player => player.hand.length === 0)
}

function announceWinner() {
  const winner = players.find(player => player.hand.length === 0)
  if (winner) {
    console.log(`🎉 ${winner.name} wins the game!`)
  }
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