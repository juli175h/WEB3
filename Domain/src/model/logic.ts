import type { Card, Color } from "./UnoCard";
import { createInitialDeck, shuffle, deal, RNG } from "./deck";
import type { GameState, PlayerState, RoundState } from "./types";
import { currentRound, withRound } from "./types";
import * as _ from 'lodash/fp';

const WINNING_SCORE = 500;

export function newGame(playerNames: string[], rng?: RNG): GameState {
  const players: PlayerState[] = playerNames.map((n, i) => ({ id: i, name: n, score: 0, hand: [] as Card[] }));
  const deck = rng ? shuffle(createInitialDeck(), rng) : createInitialDeck();
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

function dealInitialHands(players: PlayerState[], deck: ReadonlyArray<Card>): [ReadonlyArray<Card>, ReadonlyArray<PlayerState>] {
  const pCount = players.length;
  const hands: PlayerState[] = players.map((p, pi) => {
    const hand: Card[] = [];
    for (let j = 0; j < 7; j++) {
      const pos = j * pCount + pi;
      if (pos < deck.length) hand.push(deck[pos]);
    }
    return { ...p, hand };
  });
  const remaining = deck.slice(pCount * 7);
  return [remaining, hands];
}

function dealFirstCard(deck: ReadonlyArray<Card>): [Card | undefined, ReadonlyArray<Card>] {
  // Prefer a non-wild card as the starting discard. If none exists, fall back
  // to the first card (and if that card is a wild, leave its color unset).
  const copy = deck.slice();
  const nonWildIdx = copy.findIndex(c => c.type !== "WILD" && c.type !== "WILD DRAW");
  if (nonWildIdx >= 0) {
    const [card] = copy.splice(nonWildIdx, 1);
    return [card, copy];
  }

  // No non-wild found — fallback to first card. If it's a wild, unset color.
  const first = copy.shift();
  if (first && (first.type === "WILD" || first.type === "WILD DRAW")) {
    const wildCopy = { ...(first as any), color: undefined } as Card;
    return [wildCopy, copy];
  }
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
  const players = g.players.map((pl, idx) => idx === pIdx ? { ...pl, hand: pl.hand.concat(card) } : pl);
  return withRound({ ...g, players }, { ...r, drawPile });
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
  const newHand = player.hand.filter((_, i) => i !== handIndex);
  // prepare discard card (apply chosenColor for wilds)
  const toDiscard: Card = ((card.type === "WILD" || card.type === "WILD DRAW") && chosenColor)
    ? ({ ...(card as any), color: chosenColor } as Card)
    : ({ ...card } as Card);
  // push to discard
  const discard = r.discard.concat(toDiscard);
  const playersAfterPlay = g.players.map((pl, idx) => idx === pIdx ? { ...pl, hand: newHand } : pl);
  let g2 = withRound({ ...g, players: playersAfterPlay }, { ...r, discard });
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
      const players = g.players.map((pl, idx) => idx === target ? { ...pl, hand: pl.hand.concat(two) } : pl);
      g = { ...g, players };
      // set currentPlayerIndex to the target so the normal turn-advance
      // performed after play will skip the target player
      r2 = { ...r, drawPile: rest, currentPlayerIndex: target };
      break;
    }
    case "WILD DRAW": {
      const target = nextIndex(r, n);
      const [four, rest] = drawN(r.drawPile, 4);
      const players = g.players.map((pl, idx) => idx === target ? { ...pl, hand: pl.hand.concat(four) } : pl);
      g = { ...g, players };
      // set currentPlayerIndex to the target so the normal turn-advance
      // performed after play will skip the target player
      r2 = { ...r, drawPile: rest, currentPlayerIndex: target };
      break;
    }
    case "WILD":
    case "NUMBERED":
    default:
      break;
  }
  return withRound(g, r2);
}

function drawN(deck: ReadonlyArray<Card>, n: number): [ReadonlyArray<Card>, ReadonlyArray<Card>] {
  const drawn = deck.slice(0, n);
  const rest = deck.slice(n);
  return [drawn, rest];
}

export function isRoundOver(g: GameState): boolean {
  return g.players.some(p => p.hand.length === 0);
}

export function finishRound(g: GameState, rng?: RNG): GameState {
  const winner = g.players.find(p => p.hand.length === 0);
  if (!winner) return g;
  const points = g.players.reduce((sum, p) => (p === winner ? sum : sum + handPoints(p.hand)), 0);
  const players = g.players.map(p => (p === winner ? { ...p, score: p.score + points } : p));
  if (players.find(p => p.score >= WINNING_SCORE)) {
    const w = players.reduce((a, b) => (a.score >= b.score ? a : b));
    return _.flow([
      _.set('players', players),
      _.set('finished', true),
      _.set('winner', { id: w.id, name: w.name, score: w.score })
    ])(g) as GameState;
  }
  // start new round; use provided rng to shuffle or leave deterministic
  const deck = rng ? shuffle(createInitialDeck(), rng) : createInitialDeck();
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

function handPoints(hand: ReadonlyArray<Card>): number {
  return hand.reduce((sum, c) => sum + (c.value as number), 0);
}
