import { createAsyncThunk } from "@reduxjs/toolkit";
import type { PendingUno } from "../services/game";
import type { IndexedUno } from "../services/game";
import { new_game } from "../services/api";

export type PendingOrActive = PendingUno | IndexedUno;

export const createPendingGame = createAsyncThunk<
  PendingOrActive,
  { name: string; maxPlayers: number }
>(
  "pendingGames/createPendingGame",
  async ({ name, maxPlayers }, { rejectWithValue }) => {
    try {
      const game = await new_game(maxPlayers, name);
      return "creator" in game ? (game as PendingUno) : (game as IndexedUno);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Failed to create game");
    }
  }
);
