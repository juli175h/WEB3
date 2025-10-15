import { Player } from "../domain/Player";
import * as Game from "../domain/game";

interface GameSession {
  id: string;
  players: Player[];
  started: boolean;
}

const sessions: Record<string, GameSession> = {};

export function createSession(id: string): GameSession {
  const session: GameSession = { id, players: [], started: false };
  sessions[id] = session;
  return session;
}

export function getSession(id: string): GameSession | undefined {
  return sessions[id];
}

export function addPlayer(sessionId: string, player: Player) {
  const session = sessions[sessionId];
  if (!session) throw new Error("Session not found");
  session.players.push(player);
}

export function startGame(sessionId: string) {
  const session = sessions[sessionId];
  if (!session) throw new Error("Session not found");
  if (session.players.length < 2)
    throw new Error("At least 2 players required to start");
  Game.initializeGame(session.players);
  session.started = true;
  return session;
}
