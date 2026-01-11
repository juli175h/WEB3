// GraphQL query and mutation constants

export const HAND_QUERY = `
  query Hand($id: ID!, $player: String!) {
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
`;

export const GAME_QUERY = `
  query Game($id: ID!) {
    game(id: $id) {
      id
      pending
      finished
      winner { id name score }
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

export const ACTIVE_SUBSCRIPTION = `
  subscription ActiveSub {
    active {
      id
      pending
      finished
      winner { id name score }
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

export const LOBBY_QUERY = `
  query LobbyData {
    games { id finished players { name } }
    pending_games { id pending number_of_players players }
  }
`;

export const DRAW_MUTATION = `
  mutation Draw($id: ID!, $player: String!) {
    draw(id: $id, player: $player) { id }
  }
`;

export const PLAY_CARD_MUTATION = `
  mutation PlayCard($id: ID!, $player: String!, $handIndex: Int!, $chosenColor: Color) {
    playCardByIndex(id: $id, player: $player, handIndex: $handIndex, chosenColor: $chosenColor) { id }
  }
`;

export const SKIP_MUTATION = `
  mutation Skip($id: ID!, $player: String!) {
    skip(id: $id, player: $player) { id }
  }
`;

export const NEW_GAME_MUTATION = `
  mutation NewGame($creator: String!, $n: Int!) {
    new_game(creator: $creator, number_of_players: $n) {
      __typename
      ... on PendingGame { id }
      ... on ActiveMatch { id }
    }
  }
`;

export const JOIN_GAME_MUTATION = `
  mutation Join($id: ID!, $player: String!) {
    join(id: $id, player: $player) {
      __typename
      ... on PendingGame { id }
      ... on ActiveMatch { id }
    }
  }
`;
