import { DrawPile, DiscardPile, Hand } from "./deck"
import { Player } from "./Player"
import type { Card } from "./UnoCard"

export interface PlayerSnapshot {
  id: number
  name: string
  score: number
  hand: Card[]
}

export interface GameMemento {
  drawPile: Card[]
  discardPile: Card[]
  players: PlayerSnapshot[]
  currentPlayerIndex: number
  playDirection: 1 | -1
}

type DeckLike = { cards: Card[] }

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

export function saveMemento(args: {
  drawPile: DeckLike | DrawPile
  discardPile: DeckLike | DiscardPile
  players: Player[]
  currentPlayerIndex: number
  playDirection: 1 | -1
}): GameMemento {
  const { drawPile, discardPile, players, currentPlayerIndex, playDirection } = args

  const playerSnaps: PlayerSnapshot[] = players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    hand: deepClone(p.hand.cards),
  }))

  return {
    drawPile: deepClone(drawPile.cards),
    discardPile: deepClone(discardPile.cards),
    players: playerSnaps,
    currentPlayerIndex,
    playDirection,
  }
}

export function applyMemento(
  targets: {
    drawPile: DeckLike | DrawPile
    discardPile: DeckLike | DiscardPile
    players: Player[]
  },
  m: GameMemento
): { currentPlayerIndex: number; playDirection: 1 | -1 } {
  const { drawPile, discardPile, players } = targets

  replaceCards(drawPile, m.drawPile)
  replaceCards(discardPile, m.discardPile)

  if (players.length !== m.players.length) {
    players.splice(0, players.length)
    for (const ps of m.players) {
      const placeholder = new Player(ps.id, ps.name)
      placeholder.score = ps.score
      placeholder.hand = new Hand([])
      replaceCards(placeholder.hand, ps.hand)
      players.push(placeholder)
    }
  } else {
    for (let i = 0; i < players.length; i++) {
      const p = players[i]
      const ps = m.players[i]
      p.id = ps.id
      p.name = ps.name
      p.score = ps.score
      if (!p.hand) p.hand = new Hand([])
      replaceCards(p.hand, ps.hand)
    }
  }

  return { currentPlayerIndex: m.currentPlayerIndex, playDirection: m.playDirection }
}

function replaceCards(deck: DeckLike, next: Card[]) {
  deck.cards.splice(0, deck.cards.length, ...next)
}

export function serialize(m: GameMemento): string {
  return JSON.stringify(m)
}

export function deserialize(json: string): GameMemento {
  return JSON.parse(json) as GameMemento
}
