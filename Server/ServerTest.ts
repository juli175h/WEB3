import { startGameServer } from "./src/gameServer";

// Start WebSocket server on port 8081
startGameServer(8081);

console.log("UNO server started! Connect your clients to ws://localhost:8081");