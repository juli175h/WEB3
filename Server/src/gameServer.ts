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
import path from "path";
import { pathToFileURL } from "url";
import fs from "fs";

import { MemoryStore } from "./memorystore";
import { ServerModel } from "./serverModel.fp";
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

        // Resolve repository root robustly (works whether server is started from repo root or Server/)
        const cwd = process.cwd();
        let repoRoot = cwd;

        // If running with cwd at Server/, repo root is parent
        if (path.basename(cwd) === 'Server') {
            repoRoot = path.resolve(cwd, '..');
        }

        // If still not containing Client/UNO, try parent
        if (!fs.existsSync(path.join(repoRoot, 'Client', 'UNO'))) {
            const parent = path.resolve(repoRoot, '..');
            if (fs.existsSync(path.join(parent, 'Client', 'UNO'))) repoRoot = parent;
        }

        // Serve built client assets (assumes Client/UNO built to dist)
        const clientDist = path.join(repoRoot, 'Client', 'UNO', 'dist');
        app.use(express.static(clientDist));

        // Serve card images moved into the Server repo under src/Cards
        const cardsDir = path.join(repoRoot, 'Server', 'src', 'Cards');
        app.use('/assets/Cards', express.static(cardsDir));

        // SSR handler — load server bundle produced by Vite SSR build
        app.get("*", async (req, res) => {
            try {
                const indexHtml = await readFile(path.join(clientDist, "index.html"), "utf8");
                // server bundle path (Vite outputs SSR build to dist/server)
                const serverEntry = path.join(clientDist, "server", "entry-server.js");
            const mod = await import(pathToFileURL(serverEntry).toString());
                const { render } = mod;
                const { html, state } = await render(req.originalUrl);

                const safeState = JSON.stringify(state).replace(/</g, "\\u003c");
                const result = indexHtml.replace('<div id="root"></div>', `<div id="root">${html}</div><script>window.__INITIAL_STATE__=${safeState}</script>`);
                res.status(200).set({ "Content-Type": "text/html" }).send(result);
            } catch (err) {
                console.error('SSR render failed:', err);
                res.status(500).send('SSR error');
            }
        });

    const PORT = 4000;
    httpServer.listen(PORT, () => {
        console.log(`🚀 UNO GraphQL server running at http://localhost:${PORT}/graphql`);
    });
}

start().catch((err) => {
    console.error("💥 Server crashed:", err);
    process.exit(1);
});
