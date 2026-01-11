import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import gameReducer from './gameSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    game: gameReducer,
    ui: uiReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
