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
  // ✅ Create one PubSub instance and share it everywhere
  const pubsub = new PubSub();
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

  // ✅ Pass pubsub & api into the WS context
  const serverCleanup = useServer(
  {
    schema,
    context: () => ({ pubsub, api }),
    onConnect: () => {
      console.log("🔌 WebSocket client connected");
    },
    onSubscribe: (_ctx, msg: any) => {
      console.log("🧩 Subscription started:", msg.payload?.query);
    },
  },
  wsServer
);

  // ✅ Apollo server for queries/mutations
  const apollo = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            drainServer: async () => serverCleanup.dispose(),
          };
        },
      },
    ],
  });

  await apollo.start();
  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async () => ({ pubsub, api }),
    })
  );

  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Uno GraphQL server running at http://localhost:${PORT}/graphql`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
