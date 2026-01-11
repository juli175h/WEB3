import {
  ApolloClient,
  gql,
  InMemoryCache,
  split,
  HttpLink,
  type DocumentNode,
} from "@apollo/client/core";
import { getMainDefinition } from "@apollo/client/utilities";
// graphql-ws and the GraphQLWsLink are browser-only (use WebSocket). For SSR we must avoid creating
// a WS link during module init. We create the ws link conditionally below.
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

import {
  from_graphql_game,
  type IndexedUno,
  type PendingUno,
} from "./game";
import { Subject } from "rxjs";

/* ---------------- Apollo setup ---------------- */

const isBrowser = typeof window !== "undefined";

// Choose GraphQL base URL:
// 1) Vite env: import.meta.env.VITE_GRAPHQL_URL (e.g. "http://localhost:4000")
// 2) runtime browser: same host with port 4000
// 3) fallback: http://localhost:4000
const envUrl =
  typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GRAPHQL_URL
    ? (import.meta as any).env.VITE_GRAPHQL_URL
    : (process.env.GRAPHQL_URL as string | undefined) || undefined;

const defaultPort = "4000";

function buildHttpUrl(): string {
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (isBrowser) {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    return `${proto}//${host}:${defaultPort}`;
  }
  return `http://localhost:${defaultPort}`;
}

function buildWsUrl(httpBase: string): string {
  // convert http(s) to ws(s)
  if (httpBase.startsWith("https://")) return httpBase.replace(/^https:/, "wss:");
  if (httpBase.startsWith("http://")) return httpBase.replace(/^http:/, "ws:");
  // fallback
  return `ws://localhost:${defaultPort}`;
}

const httpBase = buildHttpUrl();
const httpLink = new HttpLink({ uri: `${httpBase.replace(/\/$/, "")}/graphql` });

let apollo: ApolloClient<any>;

if (isBrowser) {
  try {
    const wsBase = buildWsUrl(httpBase);
    const wsLink = new GraphQLWsLink(createClient({ url: `${wsBase.replace(/\/$/, "")}/graphql` }));

    const splitLink = split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === "OperationDefinition" && def.operation === "subscription";
      },
      wsLink,
      httpLink
    );

    apollo = new ApolloClient({ link: splitLink, cache: new InMemoryCache() });
  } catch (err) {
    // If WS setup fails in the browser, fall back to HTTP-only Apollo client
    console.warn("Failed to create WS link for subscriptions, falling back to HTTP. Error:", err);
    apollo = new ApolloClient({ link: httpLink, cache: new InMemoryCache() });
  }
} else {
  // SSR: don't create WS link — use plain HTTP client. Subscriptions are no-ops on server.
  apollo = new ApolloClient({ link: httpLink, cache: new InMemoryCache() });
}

/* ---------------- Helpers ---------------- */

async function query<T>(query: DocumentNode, variables?: any): Promise<T> {
  try {
    const res = await apollo.query<T>({ query, variables, fetchPolicy: "network-only" });
    if (!res.data) throw new Error("No data returned from query");
    return res.data;
  } catch (err: any) {
    const msg = `GraphQL query failed (url=${httpLink.options?.uri ?? httpBase}): ${err?.message ?? err}`;
    console.error(msg);
    throw new Error(msg);
  }
}

async function mutate<T>(mutation: DocumentNode, variables?: any): Promise<T> {
  try {
    const res = await apollo.mutate<T>({ mutation, variables, fetchPolicy: "network-only" });
    if (!res.data) throw new Error("No data returned from mutation");
    return res.data;
  } catch (err: any) {
    const msg = `GraphQL mutation failed (url=${httpLink.options?.uri ?? httpBase}): ${err?.message ?? err}`;
    console.error(msg);
    throw new Error(msg);
  }
}

/* ---------------- Subscriptions ---------------- */
// RxJS subjects so other parts of the app can consume server events as streams
const activeSubject = new Subject<IndexedUno>();
const pendingSubject = new Subject<PendingUno>();
export const active$ = activeSubject.asObservable();
export const pending$ = pendingSubject.asObservable();

interface ActiveSubscriptionResult {
  active?: any;
}
interface PendingSubscriptionResult {
  pending?: PendingUno;
}

/** Listen for active game updates (correct shape) */
export async function onActive(subscriber: (g: IndexedUno) => any) {
  const q = gql`
    subscription ActiveSub {
      active {
        id
        pending
        finished
        winner { id name score handCount }
        players { id name score handCount }
        currentRound {
          currentPlayerIndex
          direction
          discardTop {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
          drawPileCount
        }
      }
    }
  `;

  if (!isBrowser) {
    // SSR: subscriptions are not available — return early and do nothing.
    return;
  }

  const obs = apollo.subscribe<ActiveSubscriptionResult>({ query: q });
  obs.subscribe({
    next(payload: any) {
      const data = payload.data;
      if (data?.active) {
        const mapped = from_graphql_game(data.active);
        // publish to rxjs subject
        activeSubject.next(mapped);
        // also call legacy callback
        subscriber(mapped);
      }
    },
    error(err: any) {
      console.error("❌ Active subscription error:", err);
    },
  });
}

/** Listen for pending game updates (remove when pending=false) */
export function onPending(subscriber: (g: PendingUno) => any) {
  const q = gql`
    subscription PendingSub {
      pending {
        id
        pending
        creator
        players
        number_of_players
      }
    }
  `;
  if (!isBrowser) {
    // SSR: return a noop subscription object so callers can safely call unsubscribe.
    return { unsubscribe: () => {} } as any;
  }

  const obs = apollo.subscribe<PendingSubscriptionResult>({ query: q });
  const subscription = obs.subscribe({
    next(payload: any) {
      const data = payload.data;
      if (data?.pending) {
        pendingSubject.next(data.pending);
        subscriber(data.pending);
      }
    },
    error(err: any) {
      console.error("❌ Pending subscription error:", err);
    },
  });

  return subscription; // returns the object with unsubscribe
}

// Ensure we start the pending subscription once so the pending$ Subject is fed
// This keeps a single background subscription active for the lifetime of the app.
try {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onPending(() => {});
} catch (err) {
  console.warn('Could not start pending subscription at module init:', err);
}


/* ---------------- Queries ---------------- */

interface GamesQueryResult { games: any[]; }
interface GameQueryResult { game?: any; }
interface PendingGamesQueryResult { pending_games: PendingUno[]; }
interface PendingGameQueryResult { pending_game?: PendingUno; }

export async function games(): Promise<IndexedUno[]> {
  const res = await query<GamesQueryResult>(gql`
    query Games {
      games {
        id
        pending
        finished
        winner { id name score handCount }
        players { id name score handCount }
        currentRound {
          currentPlayerIndex
          direction
          discardTop {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
          drawPileCount
        }
      }
    }
  `);
  return res.games.map(from_graphql_game);
}

export async function game(id: string): Promise<IndexedUno | undefined> {
  const res = await query<GameQueryResult>(gql`
    query Game($id: ID!) {
      game(id: $id) {
        id
        pending
        finished
        winner { id name score handCount }
        players { id name score handCount }
        currentRound {
          currentPlayerIndex
          direction
          discardTop {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
          drawPileCount
        }
      }
    }
  `, { id });
  return res.game ? from_graphql_game(res.game) : undefined;
}

/* --- Fetch current player's hand --- */
interface HandQueryResult { hand: Card[] }
import type { Card } from "Domain/src/model/UnoCard";
export async function my_hand(id: string, player: string): Promise<Card[]> {
  const res = await query<HandQueryResult>(gql`
    query MyHand($id: ID!, $player: String!) {
      hand(id: $id, player: $player) {
        __typename
        ... on NumberedCard { type color value }
        ... on ReverseCard { type color value }
        ... on SkipCard { type color value }
        ... on DrawTwoCard { type color value }
        ... on WildCard { type color value }
        ... on WildDrawCard { type color value }
      }
    }
  `, { id, player });
  return res.hand ?? [];
}

export async function pending_games(): Promise<PendingUno[]> {
  const res = await query<PendingGamesQueryResult>(gql`
    query PendingGames {
      pending_games {
        id
        pending
        creator
        players
        number_of_players
      }
    }
  `);
  return res.pending_games;
}

export async function pending_game(id: string): Promise<PendingUno | undefined> {
  const res = await query<PendingGameQueryResult>(gql`
    query PendingGame($id: ID!) {
      pending_game(id: $id) {
        id
        pending
        creator
        players
        number_of_players
      }
    }
  `, { id });
  return res.pending_game;
}

/* ---------------- Mutations ---------------- */

interface NewGameResult { new_game: any; }
interface JoinResult { join: any; }
interface DrawResult { draw: any; }
interface PlayResult { playCardByIndex: any; }
interface SkipResult { skip: any }

/* --- New Game --- */
export async function new_game(
  number_of_players: number,
  player: string
): Promise<IndexedUno | PendingUno> {
  const res = await mutate<{ new_game: any }>(
    gql`
      mutation NewGame($creator: String!, $numberOfPlayers: Int!) {
        new_game(creator: $creator, number_of_players: $numberOfPlayers) {
          __typename
          ... on PendingGame {
            id
            pending
            creator
            number_of_players
            pendingPlayers: players   # ✅ alias to avoid [String!]! vs [Player!]! conflict
          }
          ... on ActiveMatch {
            id
            pending
            finished
            winner { id name score handCount }
            activePlayers: players { id name score handCount }  # ✅ alias here too
            currentRound {
              currentPlayerIndex
              direction
              discardTop {
                __typename
                ... on NumberedCard { type color value }
                ... on ReverseCard { type color value }
                ... on SkipCard { type color value }
                ... on DrawTwoCard { type color value }
                ... on WildCard { type color value }
                ... on WildDrawCard { type color value }
              }
              drawPileCount
            }
          }
        }
      }
    `,
    { creator: player, numberOfPlayers: number_of_players }
  );

  const g = res.new_game;

  // ✅ Normalize based on type
  if (g.__typename === "PendingGame") {
    return {
      id: g.id,
      pending: g.pending,
      creator: g.creator,
      number_of_players: g.number_of_players,
      players: g.pendingPlayers ?? [],
    } as PendingUno;
  }

  return from_graphql_game({
    id: g.id,
    pending: g.pending,
    finished: g.finished,
    winner: g.winner,
    players: g.activePlayers ?? [],
    currentRound: g.currentRound,
  });
}

/* --- Join Game --- */
export async function join(game: PendingUno, player: string): Promise<IndexedUno | PendingUno> {
  const res = await mutate<{ join: any }>(
    gql`
      mutation Join($id: ID!, $player: String!) {
        join(id: $id, player: $player) {
          __typename
          ... on PendingGame {
            id
            pending
            creator
            number_of_players
            pendingPlayers: players   # ✅ same alias fix
          }
          ... on ActiveMatch {
            id
            pending
            finished
            winner { id name score handCount }
            activePlayers: players { id name score handCount }  # ✅ alias here too
            currentRound {
              currentPlayerIndex
              direction
              discardTop {
                __typename
                ... on NumberedCard { type color value }
                ... on ReverseCard { type color value }
                ... on SkipCard { type color value }
                ... on DrawTwoCard { type color value }
                ... on WildCard { type color value }
                ... on WildDrawCard { type color value }
              }
              drawPileCount
            }
          }
        }
      }
    `,
    { id: game.id, player }
  );

  const g = res.join;

  // ✅ Normalize again
  if (g.__typename === "PendingGame") {
    return {
      id: g.id,
      pending: g.pending,
      creator: g.creator,
      number_of_players: g.number_of_players,
      players: g.pendingPlayers ?? [],
    } as PendingUno;
  }

  return from_graphql_game({
    id: g.id,
    pending: g.pending,
    finished: g.finished,
    winner: g.winner,
    players: g.activePlayers ?? [],
    currentRound: g.currentRound,
  });
}

// NOTE: Do NOT start subscriptions at module init when running under SSR —
// the server environment may lack WebSocket support. Start subscriptions from
// the client entry (e.g. `main.tsx`) where `window` is defined.


/* --- Draw --- */
export async function draw(id: string, player: string) {
  const res = await mutate<DrawResult>(gql`
    mutation Draw($id: ID!, $player: String!) {
      draw(id: $id, player: $player) {
        id
        pending
        finished
        winner { id name score handCount }
        players { id name score handCount }
        currentRound {
          currentPlayerIndex
          direction
          discardTop {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
          drawPileCount
        }
      }
    }
  `, { id, player });
  return from_graphql_game(res.draw);
}

/* --- Play Card --- */
export async function playCardByIndex(
  id: string,
  player: string,
  handIndex: number,
  chosenColor?: string
) {
  const res = await mutate<PlayResult>(gql`
    mutation PlayCard(
      $id: ID!
      $player: String!
      $handIndex: Int!
      $chosenColor: Color
    ) {
      playCardByIndex(
        id: $id
        player: $player
        handIndex: $handIndex
        chosenColor: $chosenColor
      ) {
        id
        pending
        finished
        winner { id name score handCount }
        players { id name score handCount }
        currentRound {
          currentPlayerIndex
          direction
          discardTop {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
          drawPileCount
        }
      }
    }
  `, { id, player, handIndex, chosenColor });
  return from_graphql_game(res.playCardByIndex);
}

export async function skipTurn(id: string, player: string) {
  const res = await mutate<SkipResult>(gql`
    mutation Skip($id: ID!, $player: String!) {
      skip(id: $id, player: $player) {
        id
        pending
        finished
        winner { id name score handCount }
        players { id name score handCount }
        currentRound {
          currentPlayerIndex
          direction
          discardTop {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
          drawPileCount
        }
      }
    }
  `, { id, player });
  return from_graphql_game(res.skip);
}
