import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { PendingUno } from "../services/game";
import { new_game, join, pending_games, onPending } from "../services/api";
import type { RootState } from "./store";

/* ---------------- Async Thunks ---------------- */

// Fetch all pending games
export const fetchPendingGames = createAsyncThunk<PendingUno[]>(
  "pendingGames/fetchPendingGames",
  async () => {
    const res = await pending_games();
    return res.slice();
  }
);

// Create a new pending game
export const createPendingGame = createAsyncThunk<PendingUno, { name: string; maxPlayers: number }>(
  "pendingGames/createPendingGame",
  async ({ name, maxPlayers }) => {
    const res = await new_game(maxPlayers, name);

    // Only allow PendingUno
    if ("creator" in res) return res as PendingUno;

    throw new Error("Game became active immediately; not a pending game");
  }
);

// Join an existing pending game
export const joinPendingGame = createAsyncThunk<PendingUno, { id: string; name: string }>(
  "pendingGames/joinPendingGame",
  async ({ id, name }) => {
    const res = await join({ id } as PendingUno, name);

    // Only allow PendingUno
    if ("creator" in res) return res as PendingUno;

    throw new Error("Game became active immediately; not a pending game");
  }
);

/* ---------------- Slice ---------------- */

interface PendingGamesState {
  pendingGames: PendingUno[];
  loading: boolean;
  error: boolean;
}

const initialState: PendingGamesState = {
  pendingGames: [],
  loading: false,
  error: false,
};

export const pendingGamesSlice = createSlice({
  name: "pendingGames",
  initialState,
  reducers: {
    addOrUpdateGame: (state, action: PayloadAction<PendingUno>) => {
      const idx = state.pendingGames.findIndex((g) => g.id === action.payload.id);
      if (idx !== -1) {
        state.pendingGames[idx] = { ...state.pendingGames[idx], ...action.payload };
      } else {
        state.pendingGames.push({ ...action.payload, players: action.payload.players ?? [] });
      }
    },
    removeGame: (state, action: PayloadAction<string>) => {
      state.pendingGames = state.pendingGames.filter((g) => g.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingGames.pending, (state) => {
        state.loading = true;
        state.error = false;
      })
      .addCase(fetchPendingGames.fulfilled, (state, action: PayloadAction<PendingUno[]>) => {
        state.loading = false;
        state.pendingGames = action.payload;
      })
      .addCase(fetchPendingGames.rejected, (state) => {
        state.loading = false;
        state.error = true;
      })

      .addCase(createPendingGame.pending, (state) => {
        state.loading = true;
        state.error = false;
      })
      .addCase(createPendingGame.fulfilled, (state, action: PayloadAction<PendingUno>) => {
        state.loading = false;
        state.pendingGames.push(action.payload);
      })
      .addCase(createPendingGame.rejected, (state) => {
        state.loading = false;
        state.error = true;
      })

      .addCase(joinPendingGame.pending, (state) => {
        state.loading = true;
        state.error = false;
      })
      .addCase(joinPendingGame.fulfilled, (state, action: PayloadAction<PendingUno>) => {
        state.loading = false;
        const idx = state.pendingGames.findIndex((g) => g.id === action.payload.id);
        if (idx !== -1) {
          state.pendingGames[idx] = action.payload;
        } else {
          state.pendingGames.push(action.payload);
        }
      })
      .addCase(joinPendingGame.rejected, (state) => {
        state.loading = false;
        state.error = true;
      });
  },
});

/* ---------------- Exports ---------------- */

export const { addOrUpdateGame, removeGame } = pendingGamesSlice.actions;

export default pendingGamesSlice.reducer;

/* ---------------- Selectors ---------------- */

// Get a specific pending game by id
export const selectGameById = (state: RootState, id: string): PendingUno | undefined =>
  state.pendingGames.pendingGames.find((g) => g.id === id);

/* ---------------- Subscriptions ---------------- */

// Subscribe to pending updates (calls callback when game becomes active)
export const subscribeToUpdates = (callback: (id: string) => void) => {
  // onPending returns an object with an unsubscribe method, not a promise
  const subscription = onPending((game: PendingUno) => {
    if (!game.pending) callback(game.id);
  });

  // Return the unsubscribe function for cleanup
  return () => subscription?.unsubscribe?.();
};

