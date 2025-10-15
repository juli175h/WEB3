import { WebSocketServer } from "ws";
import { getSession, startGame } from "./sessionManager";
import * as Game from "../domain/game";
import { PlayerMove } from "./types";

const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", ws => {
  let sessionId: string | null = null;
  let playerName: string | null = null;

  ws.on("message", data => {
    const msg = JSON.parse(data.toString());
    const { action, payload } = msg;

    if (action === "join") {
      sessionId = payload.sessionId;
      playerName = payload.name;
      const session = getSession(sessionId);
      if (!session) {
        ws.send(JSON.stringify({ error: "Session not found" }));
        return;
      }
      const player = { name: playerName, hand: [], score: 0 } as any;
      session.players.push(player);
      broadcast(sessionId, { event: "player_joined", name: playerName });
    }

    if (action === "start") {
      if (!sessionId) return;
      const session = startGame(sessionId);
      broadcast(sessionId, {
        event: "game_started",
        players: session.players.map(p => p.name),
      });
    }

    if (action === "move") {
      if (!sessionId || !playerName) return;
      const move = payload as PlayerMove;
      handleMove(sessionId, playerName, move);
    }
  });
});

function broadcast(sessionId: string, message: any) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ sessionId, ...message }));
    }
  });
}

function handleMove(sessionId: string, playerName: string, move: PlayerMove) {
  const session = getSession(sessionId);
  if (!session) return;
  const player = session.players.find(p => p.name === playerName);
  if (!player) return;

  try {
    if (move.type === "DRAW_CARD") {
      Game.drawCard(player);
    } else if (move.type === "PLAY_CARD" && move.cardId) {
      const card = player.hand.cards.find(c => c.id === move.cardId);
      if (!card) throw new Error("Card not found");
      Game.playCard(player, card);
    }
  } catch (e: any) {
    broadcast(sessionId, { event: "error", message: e.message });
    return;
  }

  broadcast(sessionId, {
    event: "state_update",
    topCard: Game["discardPile"].top(),
    currentPlayer: Game["currentPlayer"].name,
  });
}

console.log("🃏 Game WebSocket server running on ws://localhost:8081");
