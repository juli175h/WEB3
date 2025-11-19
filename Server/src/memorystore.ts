import { IndexedUnoMatch, PendingGame, GameStore } from "./serverModel.fp";

export class MemoryStore implements GameStore {
  private _games: IndexedUnoMatch[] = [];
  private _pending: PendingGame[] = [];
  private nextId = 1;

  async games() {
    return [...this._games];
  }

  async game(id: string) {
    return this._games.find((g) => g.id === id);
  }

  async add(game: IndexedUnoMatch) {
    this._games.push(game);
    return game;
  }

  async update(game: IndexedUnoMatch) {
    const i = this._games.findIndex((g) => g.id === game.id);
    if (i !== -1) this._games[i] = game;
    return game;
  }

  async pending_games() {
    return [...this._pending];
  }

  async pending_game(id: string) {
    return this._pending.find((p) => p.id === id);
  }

  async add_pending(game: Omit<PendingGame, "id">) {
    const g: PendingGame = { ...game, id: (this.nextId++).toString() };
    this._pending.push(g);
    return g;
  }

  async delete_pending(id: string) {
    this._pending = this._pending.filter((p) => p.id !== id);
  }

  async update_pending(pending: PendingGame) {
    const i = this._pending.findIndex((p) => p.id === pending.id);
    if (i !== -1) this._pending[i] = pending;
    return pending;
  }
}
