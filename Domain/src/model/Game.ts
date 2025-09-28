import { createInitialDeck, DrawPile, DiscardPile, Hand } from "./deck"
import { Player } from "./Player"
import { Card, Color } from "./UnoCard"

let drawPile: DrawPile
let discardPile: DiscardPile
let players: Player[]
let currentPlayer: Player
let currentPlayerIndex = 0
let playDirection = 1 // 1 = clockwise, -1 = counter-clockwise
const WINNING_SCORE = 500

function initializeGame(initialPlayers: Player[]): void {
  players = initialPlayers
  players.forEach(p => (p.score = 0)) // track scores

  startNewRound()
}

function startNewRound() {
  drawPile = new DrawPile(createInitialDeck().cards)
  discardPile = new DiscardPile()
  drawPile.shuffle()

  players.forEach(player => {
    player.resetHand()
    player.draw(drawPile, 7)
  })

  // deal first card
  let card = drawPile.deal()
  while (card?.type === "WILD" || card?.type === "WILD DRAW") {
    // can't start with wilds
    drawPile.add(card)
    drawPile.shuffle()
    card = drawPile.deal()
  }
  if (card) discardPile.add(card)

  currentPlayerIndex = 0
  currentPlayer = players[0]
  playDirection = 1
}


function nextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + playDirection + players.length) % players.length
  currentPlayer = players[currentPlayerIndex]
}

function chooseColor(): Color {
  // Example: just pick random for now, replace with UI/AI logic
  const colors: Color[] = ["RED", "BLUE", "GREEN", "YELLOW"];
  return colors[Math.floor(Math.random() * colors.length)];
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
      // Player chooses a color
      card.color = chooseColor();
      nextPlayer();
      currentPlayer.draw(drawPile, 4);
      break;

    case "WILD":
      // Player chooses a color
      card.color = chooseColor();
      break;
  }
}

function playCard(player: Player, card: Card) {
  if (!IsLegalCard(card, discardPile.top())) {
    throw new Error("Illegal move")
  }

  // Remove card from player's hand
  player.hand.play(card)
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
    player.hand.add(card)
  }
}



function Round(): Player | null {
 /* while (!isRoundOver()) {
    const playableCard = currentPlayer.hand.find(c =>
      IsLegalCard(c, discardPile.top())
    )

    if (playableCard) {
      playCard(currentPlayer, playableCard)
    } else {
      drawCard(currentPlayer)
      const newCard = currentPlayer.hand[currentPlayer.hand.length - 1]
      if (IsLegalCard(newCard, discardPile.top())) {
        playCard(currentPlayer, newCard)
      } else {
        nextPlayer()
      }
    }
  }*/

  return finishRound()
}

function isRoundOver(): boolean {
  return players.some(player => player.hand.length === 0)
}

function finishRound(): Player | null {
  const winner = players.find(p => p.hand.length === 0)
  if (!winner) return null

  let roundPoints = 0
  for (const player of players) {
    if (player !== winner) {
      roundPoints += calculateHandPoints(player.hand)
    }
  }

  winner.score += roundPoints
  console.log(`🎉 ${winner.name} wins the round and earns ${roundPoints} points! (Total: ${winner.score})`)

  return winner
}

function calculateHandPoints(hand: Hand): number {
  return hand.cards.reduce((sum, card) => sum + card.value, 0)
}

function playGame() {
  initializeGame(players)

  let gameOver = false
  while (!gameOver) {
    const roundWinner = Round()
    if (roundWinner && roundWinner.score >= WINNING_SCORE) {
      console.log(`🏆 ${roundWinner.name} wins the game with ${roundWinner.score} points!`)
      gameOver = true
    } else {
      startNewRound()
    }
  }
}

// Utility
function IsLegalCard(playerCard: Card, topCard?: Card) {
  if (!topCard) return true
  if (playerCard.type === "WILD" || playerCard.type === "WILD DRAW") return true

  if (playerCard.type === topCard.type) {
    if (playerCard.type === "NUMBERED" && topCard.type === "NUMBERED") {
      return playerCard.color === topCard.color || playerCard.value === topCard.value
    }
    return true
  }

  if ("color" in playerCard && "color" in topCard && playerCard.color === topCard.color) {
    return true
  }

  return false
}
