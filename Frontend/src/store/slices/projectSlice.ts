import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectAPI } from '@/lib/api/projects';

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: { min: number; max: number };
  skills: string[];
  client: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    role: 'client' | 'freelancer';
    totalProjects?: number;
    hireRate?: number;
  };
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  urgency?: 'low' | 'medium' | 'high';
  bids: number;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
  featured?: boolean;
  category?: string;
  location?: string;
  deadline?: string;
  // Enriched fields from backend for completed projects
  totalPaid?: number;
  ratingAvg?: number;
  ratingCount?: number;
  hiredBidRate?: number;
  isGroupProject?: boolean;
}

interface ProjectState {
  list: Project[];
  detail: Project | null;
  completedProjects: {
    items: Project[];
    pagination: {
      page: number;
      limit: number;
      pages: number;
      total: number;
    };
  };
  filters: {
    search: string;
    skills: string[];
    budgetRange: [number, number];
    urgency?: string;
  };
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ProjectState = {
  list: [],
  detail: null,
  completedProjects: {
    items: [],
    pagination: {
      page: 1,
      limit: 10,
      pages: 0,
      total: 0
    }
  },
  filters: {
    search: '',
    skills: [],
    budgetRange: [0, 10000],
  },
  status: 'idle',
  error: null,
};

export const fetchProjects = createAsyncThunk('project/fetchProjects', async (filters?: any) => {
  const response = await projectAPI.getProjects(filters);
  return response;
});

export const fetchProjectDetail = createAsyncThunk('project/fetchProjectDetail', async (id: string) => {
  const response = await projectAPI.getProjectById(id);
  return response;
});

export const createProject = createAsyncThunk('project/createProject', async (data: Partial<Project>) => {
  const response = await projectAPI.createProject(data);
  return response;
});

export const fetchCompletedProjects = createAsyncThunk(
  'project/fetchCompletedProjects',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number }) => {
    const response = await projectAPI.getCompletedProjects(page, limit);
    return response;
  }
);

export const completeProject = createAsyncThunk(
  'project/completeProject',
  async ({ projectId, data }: { projectId: string; data: any }) => {
    const response = await projectAPI.completeProject(projectId, data);
    return response;
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch projects';
      })
      .addCase(fetchProjectDetail.fulfilled, (state, action) => {
        state.detail = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
      })
      .addCase(fetchCompletedProjects.fulfilled, (state, action) => {
        state.completedProjects = {
          items: action.payload.projects,
          pagination: action.payload.pagination
        };
      })
      .addCase(completeProject.fulfilled, (state, action) => {
        // Update project status in list and detail if present
        const { projectId } = action.meta.arg;
        const project = state.list.find(p => p.id === projectId);
        if (project) {
          project.status = 'completed';
        }
        if (state.detail?.id === projectId) {
          state.detail.status = 'completed';
        }
      });
  },
});

export const { setFilters, clearFilters } = projectSlice.actions;
export default projectSlice.reducer;
