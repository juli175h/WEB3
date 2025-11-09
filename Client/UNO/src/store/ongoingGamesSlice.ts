import { createSlice} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Card } from "Domain/src/model/UnoCard";
import type { Player } from "Domain/src/model/Player";
import type { UnoMatch } from "Domain/src/model/UnoMatch";
import { createMatch as createDomainMatch, currentRound, finishRound as finishRoundMatch } from "Domain/src/model/UnoMatch";
import { playCard as playCardRound, drawCard as drawCardRound } from "Domain/src/model/UnoRound";

interface OngoingGame {
  id: string;
  match: UnoMatch;
}

interface OngoingGamesState {
  games: OngoingGame[];
  nextId: number;
}

const initialState: OngoingGamesState = {
  games: [],
  nextId: 1,
};

export const ongoingGamesSlice = createSlice({
  name: "ongoingGames",
  initialState,
  reducers: {
    createMatch: (state, action: PayloadAction<{ id: string; playerNames: string[] }>) => {
      const newMatch: OngoingGame = {
        id: action.payload.id,
        match: createDomainMatch(action.payload.playerNames),
      };
      state.games.push(newMatch);
    },
    playCard: (state, action: PayloadAction<{ gameId: string; playerId: number; card: Card }>) => {
      const g = state.games.find(g => g.id === action.payload.gameId);
      if (!g) return;

      // Update the current round using the pure function
      const updatedRound = playCardRound(currentRound(g.match), action.payload.playerId, action.payload.card);

      // Replace the last round with the updated round
      g.match.rounds[g.match.rounds.length - 1] = updatedRound;
    },
    drawCard: (state, action: PayloadAction<{ gameId: string; playerId: number }>) => {
      const g = state.games.find(g => g.id === action.payload.gameId);
      if (!g) return;

      const updatedRound = drawCardRound(currentRound(g.match), action.payload.playerId);
      g.match.rounds[g.match.rounds.length - 1] = updatedRound;
    },
    finishRound: (state, action: PayloadAction<{ gameId: string; winnerId: number; calculateHandPoints: (p: Player) => number }>) => {
      const g = state.games.find(g => g.id === action.payload.gameId);
      if (!g) return;

      g.match = finishRoundMatch(g.match, action.payload.winnerId, action.payload.calculateHandPoints);
    },
  },
});

export const { createMatch, playCard, drawCard, finishRound } = ongoingGamesSlice.actions;
export default ongoingGamesSlice.reducer;