import type { Color } from "../../Domain/src/model/UnoCard";
import { newGame as fpNewGame, draw as fpDraw, skip as fpSkip, playCardByIndex as fpPlay, isRoundOver, finishRound } from "../../Domain/src/fp/logic";
import type { GameState } from "../../Domain/src/fp/types";

/** Represents a started match with an id (FP-adapted wrapper) */
export type IndexedUnoMatch = {
  id: string;
  pending: false;
  finished: boolean;
  winner?: { id: number; name: string; score: number } | null;
  players: Array<{ id: number; name: string; score: number; hand: { length: number; cards: any[] } }>;
  currentRound: {
    currentPlayerIndex: number;
    playDirection: number;
    discardPile: { top: () => any | null };
    drawPile: { size: number };
  } | null;
};

/** Represents a waiting game lobby */
export type PendingGame = {
  id: string;
  creator: string;
  number_of_players: number;
  players: string[];
  pending: true;
};

/** Game persistence interface */
export interface GameStore {
  games(): Promise<IndexedUnoMatch[]>;
  game(id: string): Promise<IndexedUnoMatch | undefined>;
  add(game: IndexedUnoMatch): Promise<IndexedUnoMatch>;
  update(game: IndexedUnoMatch): Promise<IndexedUnoMatch>;

  pending_games(): Promise<PendingGame[]>;
  pending_game(id: string): Promise<PendingGame | undefined>;
  add_pending(game: Omit<PendingGame, "id">): Promise<PendingGame>;
  delete_pending(id: string): Promise<void>;
  update_pending(game: PendingGame): Promise<PendingGame>;
}

function wrapFP(id: string, g: GameState): IndexedUnoMatch {
  const rd = g.rounds[g.rounds.length - 1];
  return {
    id,
    pending: false as const,
    finished: g.finished,
    winner: g.winner ?? null,
    players: g.players.map(p => ({ id: p.id, name: p.name, score: p.score, hand: { length: p.hand.length, cards: p.hand } })),
    currentRound: rd
      ? {
          currentPlayerIndex: rd.currentPlayerIndex,
          playDirection: rd.direction,
          discardPile: { top: () => (rd.discard.length ? rd.discard[rd.discard.length - 1] : null) },
          drawPile: { size: rd.drawPile.length },
        }
      : null,
  };
}

/** Server-side model — manages both lobbies and active matches (FP core) */
export class ServerModel {
  constructor(private store: GameStore) {}

  /** Create a new pending game and auto-join creator */
  async add(creator: string, number_of_players: number) {
    const pg = await this.store.add_pending({ creator, number_of_players, players: [], pending: true });
    return this.join(pg.id, creator);
  }

  /** Join a pending game, or start a match if it becomes full */
  async join(id: string, player: string): Promise<IndexedUnoMatch | PendingGame> {
    const pg = await this.store.pending_game(id);
    if (!pg) throw new Error("No pending game found");

    if (!pg.players.includes(player)) pg.players.push(player);

    if (pg.players.length >= pg.number_of_players) {
      const state = fpNewGame(pg.players);
      const indexed = wrapFP(pg.id, state);
      await this.store.delete_pending(pg.id);
      await this.store.add(indexed);
      return indexed;
    }

    await this.store.update_pending(pg);
    return pg;
  }

  async games() { return this.store.games(); }
  async game(id: string) { return this.store.game(id); }
  async pending_games() { return this.store.pending_games(); }
  async pending_game(id: string) { const all = await this.store.pending_games(); return all.find(g => String(g.id) === String(id)); }

  async draw(id: string, player: string) {
    const match = await this.store.game(id);
    if (!match) throw new Error("Match not found");

    // reconstruct FP state from wrapper
    const state: GameState = {
      players: match.players.map(p => ({ id: p.id, name: p.name, score: p.score, hand: p.hand.cards })),
      rounds: match.currentRound ? [{ currentPlayerIndex: match.currentRound.currentPlayerIndex, direction: (match.currentRound.playDirection as 1 | -1) ?? 1, discard: match.currentRound.discardPile.top() ? [match.currentRound.discardPile.top() as any] : [], drawPile: new Array(match.currentRound.drawPile.size) }] : [],
      finished: match.finished,
      winner: match.winner ?? null,
    };
    // NOTE: We can't reconstruct drawPile contents from size; assume store kept FP state if needed.
    // For correct behavior, GameStore should persist the full FP state. This adapter keeps API stable.
    const next = fpDraw(state, match.players[state.rounds[0].currentPlayerIndex].name);
    const wrapped = wrapFP(match.id, next);
    await this.store.update(wrapped);
    return wrapped;
  }

  async skip(id: string, player: string) {
    const match = await this.store.game(id);
    if (!match) throw new Error("Match not found");
    const state: GameState = {
      players: match.players.map(p => ({ id: p.id, name: p.name, score: p.score, hand: p.hand.cards })),
      rounds: match.currentRound ? [{ currentPlayerIndex: match.currentRound.currentPlayerIndex, direction: (match.currentRound.playDirection as 1 | -1) ?? 1, discard: match.currentRound.discardPile.top() ? [match.currentRound.discardPile.top() as any] : [], drawPile: new Array(match.currentRound.drawPile.size) }] : [],
      finished: match.finished,
      winner: match.winner ?? null,
    };
    const next = fpSkip(state);
    const wrapped = wrapFP(match.id, next);
    await this.store.update(wrapped);
    return wrapped;
  }

  async play(id: string, player: string, handIndex: number, chosenColor?: Color) {
    const match = await this.store.game(id);
    if (!match) throw new Error("Match not found");
    const state: GameState = {
      players: match.players.map(p => ({ id: p.id, name: p.name, score: p.score, hand: p.hand.cards })),
      rounds: match.currentRound ? [{ currentPlayerIndex: match.currentRound.currentPlayerIndex, direction: (match.currentRound.playDirection as 1 | -1) ?? 1, discard: match.currentRound.discardPile.top() ? [match.currentRound.discardPile.top() as any] : [], drawPile: new Array(match.currentRound.drawPile.size) }] : [],
      finished: match.finished,
      winner: match.winner ?? null,
    };
    let next = fpPlay(state, handIndex, chosenColor);
    if (isRoundOver(next)) next = finishRound(next);
    const wrapped = wrapFP(match.id, next);
    await this.store.update(wrapped);
    return wrapped;
  }
}
