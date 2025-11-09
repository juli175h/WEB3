import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface PlayerState {
  player?: string;
}

const initialState: PlayerState = {
  player: undefined,
};

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setPlayer: (state, action: PayloadAction<string>) => {
      state.player = action.payload;
    },
    clearPlayer: (state) => {
      state.player = undefined;
    },
  },
});

export const { setPlayer, clearPlayer } = playerSlice.actions;
export default playerSlice.reducer;
