import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/use/ws";
import { readFile } from "fs/promises";
import { PubSub } from "graphql-subscriptions";

import { MemoryStore } from "./memorystore";
import { ServerModel, IndexedUnoMatch, PendingGame } from "./serverModel.fp";
import { create_api, Broadcaster, toGraphQLMatch } from "./api";
import { create_resolvers } from "./resolvers";

export async function startGameServer() {
    const pubsub = new PubSub();
    const store = new MemoryStore();
    const serverModel = new ServerModel(store);

    const broadcaster: Broadcaster = {
        async broadcast(game: IndexedUnoMatch | PendingGame) {
            if (game.pending) {
                console.log("🔁 Broadcasting pending update:", game.id);
                pubsub.publish("PENDING_UPDATED", { pending: game });
            } else {
                console.log("🚀 Broadcasting ACTIVE_UPDATED:", game.id);
                const active = toGraphQLMatch(game as IndexedUnoMatch);
                pubsub.publish("ACTIVE_UPDATED", { active });

                // also notify pending subscribers that the lobby is over
                const ended = {
                    id: game.id,
                    creator: active.players[0]?.name ?? "system",
                    number_of_players: active.players.length,
                    players: active.players.map((p) => p.name),
                    pending: false,
                };
                pubsub.publish("PENDING_UPDATED", { pending: ended });
            }
        }
    };

    const api = create_api(broadcaster, serverModel);

    const typeDefs = `#graphql\n${await readFile("./Uno.sdl", "utf8")}`;
    const resolvers = create_resolvers(pubsub, api);
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const app = express();
    // allow localhost and 127.0.0.1 on any port, plus the explicit dev host
    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          /:\/\/(?:localhost|127\.0\.0\.1):\d{1,5}$/,
        ],
        methods: ["GET", "POST", "OPTIONS"],
      })
    );
    app.use(express.json());

    const httpServer = http.createServer(app);

    // ✅ WebSocket server for subscriptions
    const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });

    // ✅ graphql-ws subscription server
    const subscriptionServer = useServer({ schema }, wsServer);

    // ✅ Apollo HTTP server
    const server = new ApolloServer({
        schema,
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        drainServer: async () => subscriptionServer.dispose(),
                    };
                },
            },
        ],
    });

    await server.start();
    app.use("/graphql", expressMiddleware(server, { context: async () => ({ pubsub, api }) }));

    const PORT = 4000;
    // bind to all interfaces so browser (localhost/127.0.0.1) can reach the server
    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 UNO GraphQL server running at http://localhost:${PORT}/graphql (bound to 0.0.0.0)`);
    });
}

// Add a top-level invocation so running this file (ts-node-dev src/gameServer.ts)
// actually starts the server. This is safe to run directly; if the module is
// imported, the exported function can still be used without starting.
if (require.main === module) {
  startGameServer().catch((err) => {
    console.error("Failed to start game server:", err);
    process.exit(1);
  });
}
