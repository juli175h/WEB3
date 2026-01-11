import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Game, UnoCard, PendingGame } from './types';
import { queryGraphQL, execGraphQL } from '../lib/graphql';
import {
  HAND_QUERY,
  GAME_QUERY,
  LOBBY_QUERY,
  DRAW_MUTATION,
  PLAY_CARD_MUTATION,
  SKIP_MUTATION,
  NEW_GAME_MUTATION,
  JOIN_GAME_MUTATION,
} from './queries';

// ============ Async Thunks ============

// Fetch player's hand
export const fetchHand = createAsyncThunk(
  'game/fetchHand',
  async ({ id, player }: { id: string; player: string }) => {
    const data = await queryGraphQL(HAND_QUERY, { id, player });
    return data.hand || [];
  }
);

// Fetch game state
export const fetchGame = createAsyncThunk(
  'game/fetchGame',
  async ({ id }: { id: string }) => {
    const data = await queryGraphQL(GAME_QUERY, { id });
    return data.game;
  }
);

// Fetch lobby data (active + pending games)
export const fetchLobby = createAsyncThunk(
  'game/fetchLobby',
  async () => {
    const data = await queryGraphQL(LOBBY_QUERY);
    return {
      activeGames: (data?.games || []).filter((g: Game) => !g.finished),
      pendingGames: data?.pending_games || [],
    };
  }
);

// Draw a card
export const drawCard = createAsyncThunk(
  'game/drawCard',
  async ({ id, player }: { id: string; player: string }) => {
    await execGraphQL(DRAW_MUTATION, { id, player });
    // Fetch updated hand after drawing
    const handData = await queryGraphQL(HAND_QUERY, { id, player });
    return handData.hand || [];
  }
);

// Play a card by index
export const playCard = createAsyncThunk(
  'game/playCard',
  async ({ id, player, handIndex, chosenColor }: { 
    id: string; 
    player: string; 
    handIndex: number; 
    chosenColor?: string | null;
  }) => {
    await execGraphQL(PLAY_CARD_MUTATION, { id, player, handIndex, chosenColor });
    // Fetch updated hand and game after playing
    const [handData, gameData] = await Promise.all([
      queryGraphQL(HAND_QUERY, { id, player }),
      queryGraphQL(GAME_QUERY, { id }),
    ]);
    return {
      hand: handData.hand || [],
      game: gameData.game,
    };
  }
);

// Skip turn (after drawing)
export const skipTurn = createAsyncThunk(
  'game/skipTurn',
  async ({ id, player }: { id: string; player: string }) => {
    await execGraphQL(SKIP_MUTATION, { id, player });
    // Fetch updated hand and game after skipping
    const [handData, gameData] = await Promise.all([
      queryGraphQL(HAND_QUERY, { id, player }),
      queryGraphQL(GAME_QUERY, { id }),
    ]);
    return {
      hand: handData.hand || [],
      game: gameData.game,
    };
  }
);

// Create a new game
export const createGame = createAsyncThunk(
  'game/createGame',
  async ({ creator, numberOfPlayers }: { creator: string; numberOfPlayers: number }) => {
    const data = await execGraphQL(NEW_GAME_MUTATION, { creator, n: numberOfPlayers });
    return data.new_game;
  }
);

// Join a pending game
export const joinGame = createAsyncThunk(
  'game/joinGame',
  async ({ id, player }: { id: string; player: string }) => {
    const data = await execGraphQL(JOIN_GAME_MUTATION, { id, player });
    return data.join;
  }
);

// ============ Slice ============

interface GameState {
  // Current active game
  game: Game | null;
  // Player's hand
  hand: UnoCard[];
  // Loading state
  loading: boolean;
  // Error message
  error: string | null;
  // List of active games (for lobby)
  activeGames: Game[];
  // List of pending games (for lobby)
  pendingGames: PendingGame[];
}

const initialState: GameState = {
  game: null,
  hand: [],
  loading: false,
  error: null,
  activeGames: [],
  pendingGames: [],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGame: (state, action: PayloadAction<Game | null>) => {
      state.game = action.payload;
    },
    setHand: (state, action: PayloadAction<UnoCard[]>) => {
      state.hand = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setActiveGames: (state, action: PayloadAction<Game[]>) => {
      state.activeGames = action.payload;
    },
    setPendingGames: (state, action: PayloadAction<PendingGame[]>) => {
      state.pendingGames = action.payload;
    },
    clearGame: (state) => {
      state.game = null;
      state.hand = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchHand
    builder
      .addCase(fetchHand.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHand.fulfilled, (state, action) => {
        state.loading = false;
        state.hand = action.payload;
      })
      .addCase(fetchHand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch hand';
      });

    // fetchGame
    builder
      .addCase(fetchGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGame.fulfilled, (state, action) => {
        state.loading = false;
        state.game = action.payload;
      })
      .addCase(fetchGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch game';
      });

    // fetchLobby
    builder
      .addCase(fetchLobby.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLobby.fulfilled, (state, action) => {
        state.loading = false;
        state.activeGames = action.payload.activeGames;
        state.pendingGames = action.payload.pendingGames;
      })
      .addCase(fetchLobby.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch lobby';
      });

    // drawCard
    builder
      .addCase(drawCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(drawCard.fulfilled, (state, action) => {
        state.loading = false;
        state.hand = action.payload;
      })
      .addCase(drawCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to draw card';
      });

    // playCard
    builder
      .addCase(playCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(playCard.fulfilled, (state, action) => {
        state.loading = false;
        state.hand = action.payload.hand;
        state.game = action.payload.game;
      })
      .addCase(playCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to play card';
      });

    // skipTurn
    builder
      .addCase(skipTurn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(skipTurn.fulfilled, (state, action) => {
        state.loading = false;
        state.hand = action.payload.hand;
        state.game = action.payload.game;
      })
      .addCase(skipTurn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to skip turn';
      });

    // createGame - no state changes needed, navigation happens in component
    builder
      .addCase(createGame.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create game';
      });

    // joinGame - no state changes needed, navigation happens in component
    builder
      .addCase(joinGame.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to join game';
      });
  },
});

export const {
  setGame,
  setHand,
  setLoading,
  setError,
  setActiveGames,
  setPendingGames,
  clearGame,
} = gameSlice.actions;

export default gameSlice.reducer;
