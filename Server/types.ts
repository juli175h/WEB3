import { IndexedUno, PendingGame } from "./servermodel";

export interface Broadcaster {
  send: (message: IndexedUno | PendingGame) => Promise<void>;
}
