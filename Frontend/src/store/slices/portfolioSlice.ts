import { createSlice } from '@reduxjs/toolkit';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  skills: string[];
  budget?: number;
}

interface PortfolioState {
  itemsByUser: Record<string, PortfolioItem[]>;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
}

const initialState: PortfolioState = {
  itemsByUser: {},
  uploadStatus: 'idle',
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setUserPortfolio: (state, action) => {
      state.itemsByUser[action.payload.userId] = action.payload.items;
    },
  },
});

export const { setUserPortfolio } = portfolioSlice.actions;
export default portfolioSlice.reducer;
