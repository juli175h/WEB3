"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gameServer_1 = require("./src/gameServer");
// Start WebSocket server on port 8081
(0, gameServer_1.startGameServer)(8081);
console.log("UNO server started! Connect your clients to ws://localhost:8081");
