import { WebSocketServer, WebSocket } from "ws";
import { Broadcaster } from "./broadcaster";
import { IndexedUno, PendingGame } from "./serverModel";

/**
 * In-memory set of connected WebSocket clients
 */
const clients = new Set<WebSocket>();

/**
 * Broadcaster implementation: sends game updates to all connected clients
 */
export const broadcaster: Broadcaster = {
  async send(message: IndexedUno | PendingGame) {
    const serialized = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  },
};

/**
 * Start the WebSocket game server
 */
export function startGameServer(port: number = 8081) {
  const wss = new WebSocketServer({ port });
  console.log(`🟢 UNO GameServer listening on ws://localhost:${port}`);

  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    console.log("Client connected. Total clients:", clients.size);

    ws.on("close", () => {
      clients.delete(ws);
      console.log("Client disconnected. Total clients:", clients.size);
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // For now, just log incoming messages
        console.log("Received from client:", msg);
      } catch (err) {
        console.error("Invalid JSON received:", data.toString());
      }
    });
  });
}
