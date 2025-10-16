import { UnoMatch } from "../../Domain/src/model/UnoMatch";
import type { Color } from "../../Domain/src/model/UnoCard";

/** Represents a started match with an id */
export type IndexedUnoMatch = UnoMatch & { id: string; pending: false };

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

/** Server-side model — manages both lobbies and active matches */
export class ServerModel {
  constructor(private store: GameStore) {}

  /** Create a new pending game and auto-join creator */
  async add(creator: string, number_of_players: number) {
    const pg = await this.store.add_pending({
      creator,
      number_of_players,
      players: [],
      pending: true,
    });
    return this.join(pg.id, creator);
  }

  /** Join a pending game, or start a match if it becomes full */
  async join(id: string, player: string) {
    const pg = await this.store.pending_game(id);
    if (!pg) throw new Error("No pending game found");

    if (!pg.players.includes(player)) pg.players.push(player);

    // start the actual match when full
    if (pg.players.length === pg.number_of_players) {
      const match = new UnoMatch(pg.players);

      // ✅ Keep the class instance intact — just add properties
      const indexed = Object.assign(match, {
        id: pg.id,
        pending: false as const,
      }) as IndexedUnoMatch;

      await this.store.delete_pending(pg.id);
      await this.store.add(indexed);
      return indexed;
    }

    await this.store.update_pending(pg);
    return pg;
  }

  /** Return all matches */
  async games() {
    return this.store.games();
  }

  /** Return one match */
  async game(id: string) {
    return this.store.game(id);
  }

  /** Return all pending lobbies */
  async pending_games() {
    return this.store.pending_games();
  }

  /** Return one pending lobby */
  async pending_game(id: string) {
    return this.store.pending_game(id);
  }

  /** Player draws one card */
  async draw(id: string, player: string) {
    const match = await this.store.game(id);
    if (!match) throw new Error("Match not found");

    const round = match.currentRound;
    round.drawCard(round.currentPlayer);
    await this.store.update(match);
    return match;
  }

  /** Player plays a card from hand by index */
  async play(id: string, player: string, handIndex: number, chosenColor?: Color) {
    const match = await this.store.game(id);
    if (!match) throw new Error("Match not found");

    const round = match.currentRound;
    const card = round.currentPlayer.hand.cards[handIndex];
    round.playCard(round.currentPlayer, card);

    if (round.isRoundOver()) {
      match.finishRound();
    }

    await this.store.update(match);
    return match;
  }
}
