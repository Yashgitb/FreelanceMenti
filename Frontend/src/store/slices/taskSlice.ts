import { createSlice } from '@reduxjs/toolkit';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignee?: string;
  dueDate?: string;
}

interface TaskState {
  byProjectId: Record<string, {
    todo: Task[];
    in_progress: Task[];
    review: Task[];
    done: Task[];
  }>;
}

const initialState: TaskState = {
  byProjectId: {},
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setProjectTasks: (state, action) => {
      state.byProjectId[action.payload.projectId] = action.payload.columns;
    },
  },
});

export const { setProjectTasks } = taskSlice.actions;
export default taskSlice.reducer;
