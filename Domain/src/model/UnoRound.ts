// Domain/src/model/UnoGame.ts
import { createInitialDeck, DrawPile, DiscardPile, Hand } from "./deck";
import { Player } from "./Player";
import { Card, Color } from "./UnoCard";

export class UnoGame {
  drawPile: DrawPile;
  discardPile: DiscardPile;
  players: Player[];
  currentPlayerIndex: number;
  playDirection: number; // 1 = clockwise, -1 = counter-clockwise

  constructor(players: Player[]) {
    this.players = players;
    this.drawPile = new DrawPile(createInitialDeck().cards);
    this.discardPile = new DiscardPile();
    this.currentPlayerIndex = 0;
    this.playDirection = 1;

    this.drawPile.shuffle();
    this.dealInitialHands();
    this.dealFirstCard();
  }

  private dealInitialHands() {
    for (const p of this.players) {
      p.resetHand();
      p.draw(this.drawPile, 7);
    }
  }

  private dealFirstCard() {
    let card = this.drawPile.deal();
    while (card?.type === "WILD" || card?.type === "WILD DRAW") {
      this.drawPile.add(card);
      this.drawPile.shuffle();
      card = this.drawPile.deal();
    }
    if (card) this.discardPile.add(card);
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  private nextPlayer() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + this.playDirection + this.players.length) %
      this.players.length;
  }

  private chooseColor(): Color {
    const colors: Color[] = ["RED", "BLUE", "GREEN", "YELLOW"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private applyCardEffect(card: Card) {
    switch (card.type) {
      case "SKIP":
        this.nextPlayer();
        break;
      case "REVERSE":
        this.playDirection *= -1;
        break;
      case "DRAW":
        this.nextPlayer();
        this.currentPlayer.draw(this.drawPile, 2);
        break;
      case "WILD DRAW":
        card.color = this.chooseColor();
        this.nextPlayer();
        this.currentPlayer.draw(this.drawPile, 4);
        break;
      case "WILD":
        card.color = this.chooseColor();
        break;
    }
  }

  playCard(player: Player, card: Card) {
    if (!this.isLegalCard(card, this.discardPile.top())) {
      throw new Error("Illegal move");
    }

    player.hand.play(card);
    this.discardPile.add(card);
    this.applyCardEffect(card);
    this.nextPlayer();
  }

  drawCard(player: Player) {
    const card = this.drawPile.deal();
    if (card) {
      player.hand.add(card);
    }
  }

  isRoundOver(): boolean {
    return this.players.some((p) => p.hand.length === 0);
  }

  finishRound(): Player | null {
    const winner = this.players.find((p) => p.hand.length === 0);
    if (!winner) return null;
    return winner;
  }

  calculateHandPoints(hand: Hand): number {
    return hand.cards.reduce((sum, c) => sum + c.value, 0);
  }

  private isLegalCard(playerCard: Card, topCard?: Card) {
    if (!topCard) return true;
    if (playerCard.type === "WILD" || playerCard.type === "WILD DRAW") return true;

    if (playerCard.type === topCard.type) {
      if (playerCard.type === "NUMBERED" && topCard.type === "NUMBERED") {
        return (
          playerCard.color === topCard.color || playerCard.value === topCard.value
        );
      }
      return true;
    }

    if (
      "color" in playerCard &&
      "color" in topCard &&
      playerCard.color === topCard.color
    ) {
      return true;
    }

    return false;
  }
}
