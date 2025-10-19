import {
  ApolloClient,
  gql,
  InMemoryCache,
  split,
  HttpLink,
  type DocumentNode,
} from "@apollo/client/core";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

import {
  from_graphql_game,
  type IndexedUno,
  type PendingUno,
} from "./game";

/* ---------------- Apollo setup ---------------- */

const wsLink = new GraphQLWsLink(
  createClient({ url: "ws://localhost:4000/graphql" })
);

const httpLink = new HttpLink({ uri: "http://localhost:4000/graphql" });

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === "OperationDefinition" && def.operation === "subscription";
  },
  wsLink,
  httpLink
);

const apollo = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

/* ---------------- Helpers ---------------- */

async function query<T>(query: DocumentNode, variables?: any): Promise<T> {
  const res = await apollo.query<T>({ query, variables, fetchPolicy: "network-only" });
  if (!res.data) throw new Error("No data returned from query");
  return res.data;
}

async function mutate<T>(mutation: DocumentNode, variables?: any): Promise<T> {
  const res = await apollo.mutate<T>({ mutation, variables, fetchPolicy: "network-only" });
  if (!res.data) throw new Error("No data returned from mutation");
  return res.data;
}

/* ---------------- Subscriptions ---------------- */

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

  const obs = apollo.subscribe<ActiveSubscriptionResult>({ query: q });
  obs.subscribe({
    next(payload) {
      const data = payload.data;
      if (data?.active) subscriber(from_graphql_game(data.active));
    },
    error(err) {
      console.error("❌ Active subscription error:", err);
    },
  });
}

/** Listen for pending game updates (remove when pending=false) */
export async function onPending(subscriber: (g: PendingUno) => any) {
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
  const obs = apollo.subscribe<PendingSubscriptionResult>({ query: q });
  obs.subscribe({
    next(payload) {
      const data = payload.data;
      if (data?.pending) subscriber(data.pending);
    },
    error(err) {
      console.error("❌ Pending subscription error:", err);
    },
  });
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

/* --- New Game --- */
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
