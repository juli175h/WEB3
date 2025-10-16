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

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === "OperationDefinition" &&
      def.operation === "subscription"
    );
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
  const res = await apollo.query<T>({
    query,
    variables,
    fetchPolicy: "network-only",
  });
  return res.data;
}

async function mutate<T>(mutation: DocumentNode, variables?: any): Promise<T> {
  const res = await apollo.mutate<T>({
    mutation,
    variables,
    fetchPolicy: "network-only",
  });
  return res.data!;
}

/* ---------------- Subscriptions ---------------- */

interface ActiveSubscriptionResult {
  active: {
    id: string;
    pending: boolean;
    players: { id: number; name: string; handCount: number }[];
    currentPlayerIndex: number;
    direction: number;
    discardTop?: any;
    drawPileCount: number;
  };
}

interface PendingSubscriptionResult {
  pending: {
    id: string;
    pending: boolean;
    creator: string;
    players: string[];
    number_of_players: number;
  };
}

export async function onActive(subscriber: (g: IndexedUno) => any) {
  const q = gql`
    subscription {
      active {
        id
        pending
        players { id name handCount }
        currentPlayerIndex
        direction
        discardTop { __typename type color value }
        drawPileCount
      }
    }
  `;

  const obs = apollo.subscribe<ActiveSubscriptionResult>({ query: q });
  obs.subscribe({
    next({ data }) {
      if (data?.active) subscriber(from_graphql_game(data.active));
    },
    error(err) {
      console.error("Active subscription error:", err);
    },
  });
}

export async function onPending(subscriber: (g: PendingUno) => any) {
  const q = gql`
    subscription {
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
    next({ data }) {
      if (data?.pending)
        subscriber({ ...data.pending, pending: true } as PendingUno);
    },
    error(err) {
      console.error("Pending subscription error:", err);
    },
  });
}

/* ---------------- Queries ---------------- */

interface GamesQueryResult {
  games: any[];
}

interface GameQueryResult {
  game?: any;
}

interface PendingGamesQueryResult {
  pending_games: PendingUno[];
}

interface PendingGameQueryResult {
  pending_game?: PendingUno;
}

export async function games(): Promise<IndexedUno[]> {
  const res = await query<GamesQueryResult>(
    gql`
      {
        games {
          id
          pending
          players { id name handCount }
          currentPlayerIndex
          direction
          discardTop { __typename type color value }
          drawPileCount
        }
      }
    `
  );
  return res.games.map(from_graphql_game);
}

export async function game(id: string): Promise<IndexedUno | undefined> {
  const res = await query<GameQueryResult>(
    gql`
      query($id: ID!) {
        game(id: $id) {
          id
          pending
          players { id name handCount }
          currentPlayerIndex
          direction
          discardTop { __typename type color value }
          drawPileCount
        }
      }
    `,
    { id }
  );
  return res.game ? from_graphql_game(res.game) : undefined;
}

export async function pending_games(): Promise<PendingUno[]> {
  const res = await query<PendingGamesQueryResult>(
    gql`
      {
        pending_games {
          id
          pending
          creator
          players
          number_of_players
        }
      }
    `
  );
  return res.pending_games;
}

export async function pending_game(id: string): Promise<PendingUno | undefined> {
  const res = await query<PendingGameQueryResult>(
    gql`
      query($id: ID!) {
        pending_game(id: $id) {
          id
          pending
          creator
          players
          number_of_players
        }
      }
    `,
    { id }
  );
  return res.pending_game;
}

/* ---------------- Mutations ---------------- */

interface NewGameResult {
  new_game: any;
}

interface JoinResult {
  join: any;
}

interface DrawResult {
  draw: any;
}

interface PlayResult {
  playCardByIndex: any;
}

export async function new_game(
  number_of_players: number,
  player: string
): Promise<IndexedUno | PendingUno> {
  const res = await mutate<NewGameResult>(
    gql`
      mutation($creator: String!, $numberOfPlayers: Int!) {
        new_game(creator: $creator, number_of_players: $numberOfPlayers) {
          ... on PendingGame {
            id
            pending
            creator
            number_of_players
            players
          }
          ... on ActiveGame {
            id
            pending
            players { id name handCount }
            currentPlayerIndex
            direction
            discardTop { __typename type color value }
            drawPileCount
          }
        }
      }
    `,
    { creator: player, numberOfPlayers: number_of_players }
  );

  const g = res.new_game;
  return g.pending ? (g as PendingUno) : from_graphql_game(g);
}

export async function join(game: PendingUno, player: string) {
  const res = await mutate<JoinResult>(
    gql`
      mutation($id: ID!, $player: String!) {
        join(id: $id, player: $player) {
          ... on PendingGame {
            id
            pending
            creator
            number_of_players
            players
          }
          ... on ActiveGame {
            id
            pending
            players { id name handCount }
            currentPlayerIndex
            direction
            discardTop { __typename type color value }
            drawPileCount
          }
        }
      }
    `,
    { id: game.id, player }
  );

  const g = res.join;
  return g.pending ? (g as PendingUno) : from_graphql_game(g);
}

export async function draw(id: string, player: string) {
  const res = await mutate<DrawResult>(
    gql`
      mutation($id: ID!, $player: String!) {
        draw(id: $id, player: $player) {
          id
          pending
          players { id name handCount }
          currentPlayerIndex
          direction
          discardTop { __typename type color value }
          drawPileCount
        }
      }
    `,
    { id, player }
  );
  return from_graphql_game(res.draw);
}

export async function playCardByIndex(
  id: string,
  player: string,
  handIndex: number,
  chosenColor?: string
) {
  const res = await mutate<PlayResult>(
    gql`
      mutation(
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
          players { id name handCount }
          currentPlayerIndex
          direction
          discardTop { __typename type color value }
          drawPileCount
        }
      }
    `,
    { id, player, handIndex, chosenColor }
  );
  return from_graphql_game(res.playCardByIndex);
}
