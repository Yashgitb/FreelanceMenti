import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bidAPI } from '@/lib/api/bids';


export interface Bid {
  id: string;
  projectId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar?: string;
  coverLetter: string;
  rate: number;
  timeline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'hired';
  createdAt: string;
}

interface BidState {
  byProjectId: Record<string, Bid[]>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: BidState = {
  byProjectId: {},
  status: 'idle',
  error: null,
};

export const fetchBidsByProject = createAsyncThunk('bid/fetchByProject', async (projectId: string) => {
  const response = await bidAPI.getBidsByProject(projectId);
  return { projectId, bids: response };
});

export const submitBid = createAsyncThunk('bid/submit', async (data: Partial<Bid>) => {
  const response = await bidAPI.submitBid(data);
  return response;
});

export const hireBid = createAsyncThunk('bid/hire', async ({ projectId, bidId }: { projectId: string; bidId: string }) => {
  const response = await bidAPI.hireBid(projectId, bidId);
  return response;
});

export const rejectBid = createAsyncThunk('bid/reject', async ({ projectId, bidId }: { projectId: string; bidId: string }) => {
  const response = await bidAPI.rejectBid(projectId, bidId);
  return response;
});

const bidSlice = createSlice({
  name: 'bid',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBidsByProject.fulfilled, (state, action) => {
        state.byProjectId[action.payload.projectId] = action.payload.bids;
      })
      .addCase(submitBid.fulfilled, (state, action) => {
        const projectId = action.payload.projectId;
        if (!state.byProjectId[projectId]) {
          state.byProjectId[projectId] = [];
        }
        state.byProjectId[projectId].push(action.payload);
      })
      .addCase(hireBid.fulfilled, (state, action) => {
        const projectId = action.payload.projectId;
        if (state.byProjectId[projectId]) {
          const bidIndex = state.byProjectId[projectId].findIndex(b => b.id === action.payload.id);
          if (bidIndex !== -1) {
            state.byProjectId[projectId][bidIndex] = action.payload;
          }
        }
      })
      .addCase(rejectBid.fulfilled, (state, action) => {
        const projectId = action.payload.projectId;
        if (state.byProjectId[projectId]) {
          const bidIndex = state.byProjectId[projectId].findIndex(b => b.id === action.payload.id);
          if (bidIndex !== -1) {
            state.byProjectId[projectId][bidIndex] = action.payload;
          }
        }
      });
  },
});

export default bidSlice.reducer;
