// servermodel.ts
import type { Card, Color } from "../../domain/src/model/UnoCard";
import { createInitialDeck, DrawPile, DiscardPile, Hand } from "../../domain/src/model/deck";

export type StoreError = { type: 'Not Found', key: any } | { type: 'DB Error', error: any }
export type ServerError = { type: 'Forbidden' } | StoreError
const Forbidden: ServerError = { type: 'Forbidden' } as const;

export type IndexedUno = UnoGame & { readonly id: string, readonly pending: false }
export type PendingGame = {
  id: string,
  creator: string,
  number_of_players: number,
  players: string[],
  readonly pending: true
}

export interface GameStore {
  games(): Promise<IndexedUno[]>
  game(id: string): Promise<IndexedUno | undefined>
  add(game: IndexedUno): Promise<IndexedUno>
  update(game: IndexedUno): Promise<IndexedUno>

  pending_games(): Promise<PendingGame[]>
  pending_game(id: string): Promise<PendingGame | undefined>
  add_pending(game: Omit<PendingGame, 'id'>): Promise<PendingGame>
  delete_pending(id: string): Promise<void>
  update_pending(game: PendingGame): Promise<PendingGame>
}

/** ——— Uno runtime model kept server-side ——— */
export class UnoGame {
  readonly players: { id: number, name: string, hand: Hand, score: number }[];
  playerIndex: number;
  direction: number; // 1 or -1
  draw: DrawPile;
  discard: DiscardPile;

  constructor(players: string[]) {
    const deck = createInitialDeck();
    const pile = new DrawPile(deck.cards);
    pile.shuffle();

    this.players = players.map((name, i) => ({ id: i, name, hand: new Hand([]), score: 0 }));
    this.players.forEach(p => p.hand = new Hand([]));
    this.players.forEach(p => p.hand = new Hand([]));

    // deal 7
    this.players.forEach(p => {
      for (let i = 0; i < 7; i++) {
        const c = pile.deal(); if (c) p.hand.add(c);
      }
    });

    this.draw = pile;
    this.discard = new DiscardPile();

    // first card (not wild)
    let first = this.draw.deal();
    while (first?.type === "WILD" || first?.type === "WILD DRAW") {
      this.draw.add(first);
      this.draw.shuffle();
      first = this.draw.deal();
    }
    if (first) this.discard.add(first);
    this.playerIndex = 0;
    this.direction = 1;
  }

  get current() { return this.players[this.playerIndex]; }
  private advance() {
    this.playerIndex = (this.playerIndex + this.direction + this.players.length) % this.players.length;
  }

  private isLegal(card: Card, top?: Card): boolean {
    if (!top) return true;
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

  private applyEffect(card: Card, chosenColor?: Color) {
    switch (card.type) {
      case "SKIP":
        this.advance(); // skip next
        break;
      case "REVERSE":
        this.direction *= -1;
        break;
      case "DRAW":
        this.advance();
        for (let i = 0; i < 2; i++) {
          const c = this.draw.deal(); if (c) this.current.hand.add(c);
        }
        break;
      case "WILD DRAW":
        if (chosenColor) (card as any).color = chosenColor;
        this.advance();
        for (let i = 0; i < 4; i++) {
          const c = this.draw.deal(); if (c) this.current.hand.add(c);
        }
        break;
      case "WILD":
        if (chosenColor) (card as any).color = chosenColor;
        break;
    }
  }

  drawCard(player: string) {
    if (this.current.name !== player) throw Forbidden;
    const c = this.draw.deal(); if (c) this.current.hand.add(c);
    // if you want “must play if possible” logic, do it on client or add here.
    this.advance();
  }

  playByIndex(player: string, index: number, chosenColor?: Color) {
    if (this.current.name !== player) throw Forbidden;
    const hand = this.current.hand.cards;
    if (index < 0 || index >= hand.length) throw { type: 'Not Found', key: 'handIndex' } as StoreError;

    const card = hand[index];
    const top = this.discard.top();
    if (!this.isLegal(card, top)) throw { type: 'Forbidden' } as ServerError;

    // remove from hand, put on discard
    hand.splice(index, 1);
    this.discard.add(card);

    // effects
    this.applyEffect(card, chosenColor);

    // normal turn pass
    this.advance();
  }

  toPublic() {
    return {
      players: this.players.map(p => ({ id: p.id, name: p.name, handCount: p.hand.length })),
      currentPlayerIndex: this.playerIndex,
      direction: this.direction,
      discardTop: this.discard.top(),
      drawPileCount: this.draw.size,
    };
  }

  me(name: string) {
    const p = this.players.find(pp => pp.name === name);
    if (!p) return undefined;
    return { id: p.id, name: p.name, hand: p.hand.cards };
  }
}

/** ——— ServerModel (join/new/play/draw) ——— */
export class ServerModel {
  constructor(private store: GameStore) {}

  games() { return this.store.games(); }
  game(id: string) { return this.store.game(id); }

  pending_games() { return this.store.pending_games(); }
  pending_game(id: string) { return this.store.pending_game(id); }

  async add(creator: string, number_of_players: number) {
    return this.store.add_pending({ creator, number_of_players, players: [], pending: true })
      .then(pg => pg);
  }

  private startIfReady(pg: PendingGame) {
    if (pg.players.length === pg.number_of_players) {
      const game = new UnoGame(pg.players);
      const indexed: IndexedUno = Object.assign(game, { id: pg.id, pending: false }) as any;
      return this.store.delete_pending(pg.id).then(() => this.store.add(indexed));
    }
    return this.store.update_pending(pg);
  }

  async join(id: string, player: string) {
    const pg = await this.store.pending_game(id);
    if (!pg) throw { type: 'Not Found', key: id } as StoreError;
    if (pg.players.includes(player)) return this.startIfReady(pg);
    pg.players.push(player);
    return this.startIfReady(pg);
  }

  async play(id: string, player: string, handIndex: number, chosenColor?: Color) {
    const g = await this.store.game(id);
    if (!g) throw { type: 'Not Found', key: id } as StoreError;
    g.playByIndex(player, handIndex, chosenColor);
    return this.store.update(g);
  }

  async draw(id: string, player: string) {
    const g = await this.store.game(id);
    if (!g) throw { type: 'Not Found', key: id } as StoreError;
    g.drawCard(player);
    return this.store.update(g);
  }
}
