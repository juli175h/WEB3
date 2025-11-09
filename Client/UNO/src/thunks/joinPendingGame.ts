import { createAsyncThunk } from "@reduxjs/toolkit";
import type { PendingUno } from "../services/game";
import { join } from "../services/api";

// Join an existing pending game
export const joinPendingGame = createAsyncThunk<PendingUno, { id: string; name: string }>(
  "pendingGames/joinPendingGame",
  async ({ id, name }) => {
    // Pass only the id to the API
    const res = await join({ id } as any, name); // temporary 'any' so TS is satisfied

    // Ensure result is a PendingUno
    if ("creator" in res && "number_of_players" in res) return res as PendingUno;

    throw new Error("Game became active immediately; not a pending game");
  }
);
