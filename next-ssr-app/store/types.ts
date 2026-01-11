// Shared types for Redux store

export interface UnoCard {
  __typename?: string;
  type: string;
  color?: string;
  value?: number;
}

export interface Player {
  id: string;
  name: string;
  score?: number;
  handCount?: number;
}

export interface Winner {
  id: string;
  name: string;
  score?: number;
}

export interface Round {
  currentPlayerIndex: number;
  direction: number;
  discardTop: UnoCard | null;
  drawPileCount: number;
}

export interface Game {
  id: string;
  pending: boolean;
  finished: boolean;
  winner: Winner | null;
  players: Player[];
  currentRound: Round | null;
}

export interface PendingGame {
  id: string;
  pending?: boolean;
  creator?: string;
  players: string[];
  number_of_players: number;
}

export interface DrawnCardModalState {
  open: boolean;
  card: UnoCard | null;
  cardIndex: number | null;
}
