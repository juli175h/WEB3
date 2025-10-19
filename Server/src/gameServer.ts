import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/use/ws";
import { PubSub } from "graphql-subscriptions";
import { readFile } from "fs/promises";

import { MemoryStore } from "./memorystore";
import { ServerModel } from "./serverModel";
import { create_api } from "./api";
import { create_resolvers } from "./resolvers";

async function start() {
    const pubsub = new PubSub(); // ✅ no casting
    const store = new MemoryStore();
    const serverModel = new ServerModel(store);

    const api = create_api(pubsub, serverModel);

    const typeDefs = `#graphql\n${await readFile("./Uno.sdl", "utf8")}`;
    const resolvers = create_resolvers(pubsub, api);
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const app = express();
    app.use(cors({ origin: /:\/\/localhost:/ }));
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
    httpServer.listen(PORT, () => {
        console.log(`🚀 UNO GraphQL server running at http://localhost:${PORT}/graphql`);
    });
}

start().catch((err) => {
    console.error("💥 Server crashed:", err);
    process.exit(1);
});
