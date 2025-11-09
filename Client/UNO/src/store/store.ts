import { configureStore } from "@reduxjs/toolkit";
import playerReducer from "./playerSlice";
import pendingReducer from "./pendingGamesSlice";
import ongoingReducer from "./ongoingGamesSlice";

export const store = configureStore({
  reducer: {
    player: playerReducer,
    pendingGames: pendingReducer,
    ongoingGames: ongoingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
