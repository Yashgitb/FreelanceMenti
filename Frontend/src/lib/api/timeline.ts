import { http } from './http';

export interface TimelineItem {
  _id: string;
  project: string;
  title: string;
  description?: string;
  type: 'milestone' | 'task' | 'note' | 'deadline';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  createdBy: {
    _id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    uploadedAt: string;
  }>;
  comments?: Array<{
    user: {
      _id: string;
      name: string;
      avatar?: string;
    };
    content: string;
    createdAt: string;
  }>;
  dependencies?: string[];
  tags?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  // Optional payment info (may be present when backend created escrow/partial payments)
  paymentAmount?: number;
  paymentReleased?: boolean;
  paymentId?: string;
}

export interface TimelineStats {
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
  statusBreakdown: {
    [status: string]: {
      count: number;
      hours: number;
    };
  };
}

export interface CreateTimelineItemData {
  title: string;
  description?: string;
  type?: 'milestone' | 'task' | 'note' | 'deadline';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string[];
  order?: number;
  // Optional payment to escrow for this task (client-only)
  paymentAmount?: number;
}

export interface UpdateTimelineItemData extends Partial<CreateTimelineItemData> {
  actualHours?: number;
}

export const timelineAPI = {
  // Get timeline for a project
  getProjectTimeline: async (projectId: string): Promise<TimelineItem[]> => {
    try {
      const response = await http.get(`/projects/${projectId}/timeline`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Failed to fetch project timeline:', error);
      return [];
    }
  },

  // Get timeline statistics for a project
  getTimelineStats: async (projectId: string): Promise<TimelineStats> => {
    try {
      const response = await http.get(`/projects/${projectId}/timeline/stats`);
      return response;
    } catch (error) {
      console.error('Failed to fetch timeline stats:', error);
      throw error;
    }
  },

  // Create a new timeline item
  createTimelineItem: async (projectId: string, data: CreateTimelineItemData): Promise<TimelineItem> => {
    try {
      const response = await http.post(`/projects/${projectId}/timeline`, data);
      return response;
    } catch (error) {
      console.error('Failed to create timeline item:', error);
      throw error;
    }
  },

  // Update a timeline item
  updateTimelineItem: async (itemId: string, data: UpdateTimelineItemData): Promise<TimelineItem> => {
    try {
      const response = await http.put(`/timeline/${itemId}`, data);
      return response;
    } catch (error) {
      console.error('Failed to update timeline item:', error);
      throw error;
    }
  },

  // Delete a timeline item
  deleteTimelineItem: async (itemId: string): Promise<void> => {
    try {
      await http.del(`/timeline/${itemId}`);
    } catch (error) {
      console.error('Failed to delete timeline item:', error);
      throw error;
    }
  },

  // Add comment to timeline item
  addComment: async (itemId: string, content: string): Promise<TimelineItem> => {
    try {
      const response = await http.post(`/timeline/${itemId}/comments`, { content });
      return response;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  },
};
