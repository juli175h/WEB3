import { IndexedUno, PendingGame } from "./serverModel";

export interface Broadcaster {
  send: (message: IndexedUno | PendingGame) => Promise<void>;
}
