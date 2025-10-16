import { UnoGame } from "./UnoRound";
import { Player } from "./Player";

const WINNING_SCORE = 500;

export class UnoMatch {
  readonly players: Player[];
  readonly rounds: UnoGame[];
  finished = false;
  winner?: Player;

  constructor(playerNames: string[]) {
    this.players = playerNames.map((n, i) => new Player(i, n));
    this.rounds = [];
    this.startNewRound();
  }

  get currentRound(): UnoGame {
    return this.rounds[this.rounds.length - 1];
  }

  startNewRound(): void {
    const round = new UnoGame(this.players);
    this.rounds.push(round);
  }

  finishRound(): void {
    const round = this.currentRound;
    const winner = round.finishRound();
    if (!winner) return;

    let roundPoints = 0;
    for (const player of round.players) {
      if (player !== winner) {
        roundPoints += round.calculateHandPoints(player.hand);
      }
    }

    winner.score += roundPoints;
    console.log(`🎉 ${winner.name} earns ${roundPoints} (total: ${winner.score})`);

    if (winner.score >= WINNING_SCORE) {
      this.finished = true;
      this.winner = winner;
    } else {
      this.startNewRound();
    }
  }
}
