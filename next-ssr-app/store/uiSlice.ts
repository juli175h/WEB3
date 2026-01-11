import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UnoCard, DrawnCardModalState } from './types';

interface UIState {
  // Color picker modal
  colorPickerOpen: boolean;
  pendingCardIndex: number | null;
  // Drawn card modal
  drawnCardModal: DrawnCardModalState;
}

const initialState: UIState = {
  colorPickerOpen: false,
  pendingCardIndex: null,
  drawnCardModal: {
    open: false,
    card: null,
    cardIndex: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openColorPicker: (state, action: PayloadAction<number>) => {
      state.colorPickerOpen = true;
      state.pendingCardIndex = action.payload;
    },
    closeColorPicker: (state) => {
      state.colorPickerOpen = false;
      state.pendingCardIndex = null;
    },
    openDrawnCardModal: (state, action: PayloadAction<{ card: UnoCard; cardIndex: number }>) => {
      state.drawnCardModal = {
        open: true,
        card: action.payload.card,
        cardIndex: action.payload.cardIndex,
      };
    },
    closeDrawnCardModal: (state) => {
      state.drawnCardModal = {
        open: false,
        card: null,
        cardIndex: null,
      };
    },
  },
});

export const {
  openColorPicker,
  closeColorPicker,
  openDrawnCardModal,
  closeDrawnCardModal,
} = uiSlice.actions;

export default uiSlice.reducer;
