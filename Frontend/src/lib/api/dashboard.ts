import { http } from './http';

export interface DashboardStats {
  // Common stats
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  
  // Client-specific stats
  totalSpent?: number;
  averageProjectBudget?: number;
  totalHiredFreelancers?: number;
  pendingProposals?: number;
  
  // Freelancer-specific stats
  totalEarnings?: number;
  averageProjectRate?: number;
  activeContracts?: number;
  availableJobs?: number;
  profileViews?: number;
  successRate?: number;
}

export interface RecentActivity {
  id: string;
  type: 'project_posted' | 'bid_received' | 'hired' | 'payment_released' | 'project_completed' | 'message_received';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    projectId?: string;
    amount?: number;
    freelancerName?: string;
    clientName?: string;
  };
}

export interface UpcomingTask {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  paymentAmount?: number;
}

export const dashboardAPI = {
  // Get dashboard stats
  getStats: async (): Promise<DashboardStats> => {
    try {
      const response = await http.get('/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return mock data as fallback
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalSpent: 0,
        totalEarnings: 0,
        pendingProposals: 0,
        availableJobs: 0,
      };
    }
  },

  // Get recent activity feed
  getRecentActivity: async (limit: number = 5): Promise<RecentActivity[]> => {
    try {
      const response = await http.get(`/dashboard/activity?limit=${limit}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  },

  // Get upcoming tasks/timeline items
  getUpcomingTasks: async (limit: number = 5): Promise<UpcomingTask[]> => {
    try {
      const response = await http.get(`/dashboard/tasks?limit=${limit}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Failed to fetch upcoming tasks:', error);
      return [];
    }
  },

  // Get payment summary
  getPaymentSummary: async () => {
    try {
      const response = await http.get('/dashboard/payments');
      return response;
    } catch (error) {
      console.error('Failed to fetch payment summary:', error);
      return {
        totalPaid: 0,
        totalEarned: 0,
        pendingPayments: 0,
        escrowBalance: 0,
      };
    }
  },
};