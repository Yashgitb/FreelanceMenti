import { http } from './http';
import { Project } from '@/store/slices/projectSlice';

// Transform backend data to frontend format
const transformProject = (backendProject: any): Project => {
  return {
    id: backendProject._id,
    title: backendProject.title,
    description: backendProject.description,
    budget: backendProject.budget || { min: 0, max: 0 },
    skills: backendProject.skills || [],
    client: {
      id: backendProject.client?._id || backendProject.client,
      name: backendProject.client?.name || 'Unknown Client',
      avatar: backendProject.client?.avatar,
      bio: backendProject.client?.bio || '',
      role: backendProject.client?.role || 'client',
      // optional statistics populated by the backend
      totalProjects: backendProject.client?.totalProjects || 0,
      hireRate: backendProject.client?.hireRate || 0
    },
    status: backendProject.status || 'open',
    bids: backendProject.bids || 0,
    createdAt: backendProject.createdAt || backendProject.postedAt || new Date().toISOString(),
    completedAt: backendProject.completedAt,
    updatedAt: backendProject.updatedAt,
    urgency: backendProject.urgency || 'medium',
    featured: backendProject.featured,
    isGroupProject: backendProject.isGroupProject,
    hiredFreelancers: backendProject.hiredFreelancers,
    category: backendProject.category,
    location: backendProject.location,
    deadline: backendProject.deadline,
    // Enriched fields
    totalPaid: backendProject.totalPaid || 0,
    ratingAvg: backendProject.ratingAvg || 0,
    ratingCount: backendProject.ratingCount || 0,
    // prefer direct field added by backend, fallback to nested hiredBid.rate
    hiredBidRate: typeof backendProject.hiredBidRate !== 'undefined' ? backendProject.hiredBidRate : backendProject.hiredBid?.rate,
    remainingAmount: typeof backendProject.remainingAmount !== 'undefined' ? backendProject.remainingAmount : 0,
  };
};

export const projectAPI = {
  getProjects: async (filters?: any): Promise<Project[]> => {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const response = await http.get(`/projects${query ? `?${query}` : ''}`);
      return Array.isArray(response) ? response.map(transformProject) : [];
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      return [];
    }
  },
  getProjectById: async (id: string): Promise<Project> => {
    try {
      const response = await http.get(`/projects/${id}`);
      return transformProject(response);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      throw error;
    }
  },
  createProject: async (data: Partial<Project>): Promise<Project> => {
    try {
      const response = await http.post('/projects', data as any);
      return transformProject(response);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },
  getMyProjects: async (): Promise<Project[]> => {
    try {
      const response = await http.get('/me/projects');
      return Array.isArray(response) ? response.map(transformProject) : [];
    } catch (error) {
      console.error('Failed to fetch my projects:', error);
      return [];
    }
  },

  getCompletedProjects: async (page: number = 1, limit: number = 10): Promise<{projects: Project[], pagination: any}> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      const response = await http.get(`/me/projects/completed?${params}`);
      return {
        projects: Array.isArray(response.projects) ? response.projects.map(transformProject) : [],
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to fetch completed projects:', error);
      return { projects: [], pagination: { page: 1, limit: 10, pages: 0, total: 0 } };
    }
  },

  getProjectRatings: async (projectId: string): Promise<{ratings: any[], averageRating: number, totalRatings: number}> => {
    try {
      const response = await http.get(`/projects/${projectId}/ratings`);
      return response;
    } catch (error) {
      console.error('Failed to fetch project ratings:', error);
      return { ratings: [], averageRating: 0, totalRatings: 0 };
    }
  },

  completeProject: async (projectId: string, data: {
    finalRating?: number;
    review?: string;
    categories?: {
      communication?: number;
      quality?: number;
      timeliness?: number;
      professionalism?: number;
    };
  }): Promise<{success: boolean, message: string, finalPayment?: {amount: number}, rating?: any}> => {
    try {
      const response = await http.post(`/projects/${projectId}/complete`, data);
      return response;
    } catch (error) {
      console.error('Failed to complete project:', error);
      throw error;
    }
  },
};
