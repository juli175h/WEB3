import type { Player } from "./Player";
import type { UnoGame } from "./UnoRound";
import { createPlayer } from "./Player";
import { createGame } from "./UnoRound";

const WINNING_SCORE = 500;

export type UnoMatch = {
  players: Player[];
  rounds: UnoGame[];
  finished: boolean;
  winner?: Player;
};

// Create a new match
export const createMatch = (playerNames: string[]): UnoMatch => {
  const players = playerNames.map((name, i) => createPlayer(i, name));
  const firstRound = createGame(players);
  return {
    players,
    rounds: [firstRound],
    finished: false,
  };
};

// Get current round
export const currentRound = (match: UnoMatch): UnoGame =>
  match.rounds[match.rounds.length - 1];

// Start a new round (if match not finished)
export const startNewRound = (match: UnoMatch): UnoMatch => {
  if (match.finished) return match;
  const newRound = createGame(match.players);
  return { ...match, rounds: [...match.rounds, newRound] };
};

// Finish a round, updating scores and checking for winner
export const finishRound = (
  match: UnoMatch,
  winnerId: number,
  calculateHandPoints: (player: Player) => number
): UnoMatch => {
  const winner = match.players.find(p => p.id === winnerId);
  if (!winner) return match;

  const roundPoints = match.players
    .filter(p => p.id !== winnerId)
    .reduce((sum, p) => sum + calculateHandPoints(p), 0);

  const updatedPlayers = match.players.map(p =>
    p.id === winnerId ? { ...p, score: p.score + roundPoints } : p
  );

  const winnerNow = updatedPlayers.find(p => p.score >= WINNING_SCORE);
  const finished = !!winnerNow;

  return {
    ...match,
    players: updatedPlayers,
    finished,
    winner: finished ? winnerNow : match.winner,
    rounds: match.rounds,
  };
};
