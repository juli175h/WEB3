import type { Card, Color } from "../model/UnoCard";
import { createInitialDeck, shuffle, deal } from "./deck";
import type { GameState, PlayerState, RoundState } from "./types";
import { currentRound, withRound } from "./types";

const WINNING_SCORE = 500;

export function newGame(playerNames: string[]): GameState {
  const players: PlayerState[] = playerNames.map((n, i) => ({ id: i, name: n, score: 0, hand: [] }));
  const deck = shuffle(createInitialDeck());
  const [afterDeal, dealtPlayers] = dealInitialHands(players, deck);
  const [discardTop, drawPile] = dealFirstCard(afterDeal);
  const round: RoundState = {
    currentPlayerIndex: 0,
    direction: 1,
    discard: discardTop ? [discardTop] : [],
    drawPile,
  };
  return { players: dealtPlayers, rounds: [round], finished: false, winner: null };
}

function dealInitialHands(players: PlayerState[], deck: Card[]): [Card[], PlayerState[]] {
  let remaining = deck.slice();
  const nextPlayers = players.map(p => ({ ...p, hand: [] as Card[] }));
  for (let i = 0; i < 7; i++) {
    for (let pi = 0; pi < nextPlayers.length; pi++) {
      const c = remaining.shift();
      if (c) nextPlayers[pi].hand.push(c);
    }
  }
  return [remaining, nextPlayers];
}

function dealFirstCard(deck: Card[]): [Card | undefined, Card[]] {
  // For parity with the current codebase: allow wild as first, leave color unset
  const idx = deck.findIndex(c => c.type === "WILD" || c.type === "WILD DRAW");
  if (idx >= 0) {
    const copy = deck.slice();
    const [wild] = copy.splice(idx, 1);
    (wild as any).color = undefined;
    return [wild, copy];
  }
  const copy = deck.slice();
  const first = copy.shift();
  return [first, copy];
}

export function canPlay(card: Card, top?: Card): boolean {
  if (!top) return true;
  if ((top.type === "WILD" || top.type === "WILD DRAW") && !top.color) return true;
  if (card.type === "WILD" || card.type === "WILD DRAW") return true;
  if (card.type === top.type) {
    if (card.type === "NUMBERED" && top.type === "NUMBERED") {
      return card.color === top.color || card.value === top.value;
    }
    return true;
  }
  if ("color" in card && "color" in top && card.color && top.color && card.color === top.color) return true;
  return false;
}

function nextIndex(r: RoundState, nPlayers: number): number {
  return (r.currentPlayerIndex + r.direction + nPlayers) % nPlayers;
}

export function draw(g: GameState, playerName: string): GameState {
  const r = currentRound(g);
  const pIdx = r.currentPlayerIndex;
  const player = g.players[pIdx];
  const drawPile = r.drawPile.slice();
  const card = drawPile.shift();
  if (!card) return g;
  const nextPlayers = g.players.slice();
  nextPlayers[pIdx] = { ...player, hand: player.hand.concat(card) };
  return withRound({ ...g, players: nextPlayers }, { ...r, drawPile });
}

export function skip(g: GameState): GameState {
  const r = currentRound(g);
  return withRound(g, { ...r, currentPlayerIndex: nextIndex(r, g.players.length) });
}

export function playCardByIndex(g: GameState, handIndex: number, chosenColor?: Color): GameState {
  const r = currentRound(g);
  const pIdx = r.currentPlayerIndex;
  const player = g.players[pIdx];
  const card = player.hand[handIndex];
  if (!card) return g;
  if (!canPlay(card, r.discard[r.discard.length - 1])) throw new Error("Illegal move");

  // remove card from hand
  const newHand = player.hand.slice();
  newHand.splice(handIndex, 1);
  // prepare discard card (apply chosenColor for wilds)
  const toDiscard: Card = { ...card } as any;
  if ((toDiscard.type === "WILD" || toDiscard.type === "WILD DRAW") && chosenColor) {
    (toDiscard as any).color = chosenColor;
  }
  // push to discard
  const discard = r.discard.concat(toDiscard);
  // apply effects
  let g2 = withRound({ ...g, players: g.players.slice() }, { ...r, discard });
  g2.players[pIdx] = { ...player, hand: newHand };
  g2 = applyEffect(g2, toDiscard);
  // advance turn
  const r2 = currentRound(g2);
  return withRound(g2, { ...r2, currentPlayerIndex: nextIndex(r2, g2.players.length) });
}

function applyEffect(g: GameState, card: Card): GameState {
  const r = currentRound(g);
  let r2 = r;
  const n = g.players.length;
  switch (card.type) {
    case "SKIP": {
      r2 = { ...r, currentPlayerIndex: nextIndex(r, n) };
      break;
    }
    case "REVERSE": {
      // 2 players → acts like SKIP, then flip direction
      const afterSkip = n === 2 ? { ...r, currentPlayerIndex: nextIndex(r, n) } : r;
      r2 = { ...afterSkip, direction: (afterSkip.direction === 1 ? -1 : 1) } as RoundState;
      break;
    }
    case "DRAW": {
      const target = nextIndex(r, n);
      const [two, rest] = drawN(r.drawPile, 2);
      const players = g.players.slice();
      players[target] = { ...players[target], hand: players[target].hand.concat(two) };
      g = { ...g, players };
      r2 = { ...r, drawPile: rest };
      break;
    }
    case "WILD DRAW": {
      const target = nextIndex(r, n);
      const [four, rest] = drawN(r.drawPile, 4);
      const players = g.players.slice();
      players[target] = { ...players[target], hand: players[target].hand.concat(four) };
      g = { ...g, players };
      r2 = { ...r, drawPile: rest };
      break;
    }
    case "WILD":
    case "NUMBERED":
    default:
      break;
  }
  return withRound(g, r2);
}

function drawN(deck: Card[], n: number): [Card[], Card[]] {
  const drawn = deck.slice(0, n);
  const rest = deck.slice(n);
  return [drawn, rest];
}

export function isRoundOver(g: GameState): boolean {
  return g.players.some(p => p.hand.length === 0);
}

export function finishRound(g: GameState): GameState {
  const winner = g.players.find(p => p.hand.length === 0);
  if (!winner) return g;
  const points = g.players.reduce((sum, p) => (p === winner ? sum : sum + handPoints(p.hand)), 0);
  const players = g.players.map(p => (p === winner ? { ...p, score: p.score + points } : p));
  if (players.find(p => p.score >= WINNING_SCORE)) {
    const w = players.reduce((a, b) => (a.score >= b.score ? a : b));
    return { ...g, players, finished: true, winner: { id: w.id, name: w.name, score: w.score } };
  }
  // start new round
  const deck = shuffle(createInitialDeck());
  const [afterDeal, dealtPlayers] = dealInitialHands(players, deck);
  const [discardTop, drawPile] = dealFirstCard(afterDeal);
  const newRound: RoundState = {
    currentPlayerIndex: 0,
    direction: 1,
    discard: discardTop ? [discardTop] : [],
    drawPile,
  };
  return { ...g, players: dealtPlayers, rounds: g.rounds.concat(newRound) };
}

function handPoints(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + (c.value as number), 0);
}
