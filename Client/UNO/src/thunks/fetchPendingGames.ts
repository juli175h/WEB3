import { createAsyncThunk } from "@reduxjs/toolkit";
import type { PendingUno } from "../services/game";
import { pending_games } from "../services/api";

export const fetchPendingGames = createAsyncThunk<PendingUno[]>(
  "pendingGames/fetchPendingGames",
  async () => {
    const games = await pending_games();
    return games.slice(); // shallow copy
  }
);
