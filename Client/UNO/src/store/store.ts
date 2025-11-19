import { configureStore } from "@reduxjs/toolkit";
import playerReducer from "./playerSlice";
import pendingReducer from "./pendingGamesSlice";
import ongoingReducer from "./ongoingGamesSlice";

export function createAppStore(preloadedState?: Partial<any>) {
  return configureStore({
    reducer: {
      player: playerReducer,
      pendingGames: pendingReducer,
      ongoingGames: ongoingReducer,
    },
    preloadedState: preloadedState as any,
  });
}

// Default client store
export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
