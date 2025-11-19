import type { Player } from "./Player";
import type { Card, Color } from "./UnoCard";
import { createInitialDeck, drawCard as deckDrawCard, addCard } from "./deck";

export type UnoGame = {
  drawPile: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  playDirection: number;
};

export const createGame = (players: Player[]): UnoGame => {
  const deck = createInitialDeck().cards;
  return {
    drawPile: deck,
    discardPile: [],
    players,
    currentPlayerIndex: 0,
    playDirection: 1,
  };
};

export const nextPlayerIndex = (game: UnoGame): number =>
  (game.currentPlayerIndex + game.playDirection + game.players.length) % game.players.length;

export const applyCardEffect = (game: UnoGame, card: Card, color?: Color): UnoGame => {
  // Simplified — same logic as before but returns a new `game` object
  // ...
  return game;
};

export const playCard = (game: UnoGame, playerId: number, card: Card): UnoGame => {
  const players = game.players.map(p =>
    p.id === playerId ? { ...p, hand: p.hand.filter(c => c !== card) } : p
  );
  return {
    ...game,
    discardPile: [...game.discardPile, card],
    players,
    currentPlayerIndex: nextPlayerIndex(game),
  };
};

// Player draws one card from the draw pile into their hand (does not advance turn)
export const drawCardRound = (game: UnoGame, playerId: number): UnoGame => {
  if (!game.drawPile || game.drawPile.length === 0) return game;
  const [card, ...rest] = game.drawPile;
  if (!card) return { ...game, drawPile: rest };

  const players = game.players.map(p => (p.id === playerId ? { ...p, hand: [...p.hand, card] } : p));
  return {
    ...game,
    drawPile: rest,
    players,
  };
};

// Backwards-compatible name used by consumer code
export const drawCard = drawCardRound;
