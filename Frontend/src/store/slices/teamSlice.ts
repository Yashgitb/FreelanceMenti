import { createSlice } from '@reduxjs/toolkit';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  permissions: string[];
}

interface TeamState {
  currentTeam: {
    id: string;
    name: string;
    members: TeamMember[];
  } | null;
  invites: any[];
}

const initialState: TeamState = {
  currentTeam: null,
  invites: [],
};

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setCurrentTeam: (state, action) => {
      state.currentTeam = action.payload;
    },
  },
});

export const { setCurrentTeam } = teamSlice.actions;
export default teamSlice.reducer;
