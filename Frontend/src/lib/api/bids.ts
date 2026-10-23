import { http } from './http';
import { Bid } from '@/store/slices/bidSlice';

// Transform backend bid data to frontend format
const transformBid = (backendBid: any): Bid => {
  return {
    id: backendBid._id,
    projectId: backendBid.project?._id || backendBid.project,
    freelancerId: backendBid.freelancer?._id || backendBid.freelancer,
    freelancerName: backendBid.freelancer?.name || 'Unknown Freelancer',
    freelancerAvatar: backendBid.freelancer?.avatar,
    coverLetter: backendBid.coverLetter,
    rate: backendBid.rate,
    timeline: backendBid.timeline,
    status: backendBid.status || 'pending',
    createdAt: backendBid.createdAt || new Date().toISOString(),
  };
};

export const bidAPI = {
  getBidsByProject: async (projectId: string): Promise<Bid[]> => {
    try {
      const response = await http.get(`/projects/${projectId}/bids`);
      return Array.isArray(response) ? response.map(transformBid) : [];
    } catch (error) {
      console.error('Failed to fetch bids:', error);
      return [];
    }
  },
  submitBid: async (data: Partial<Bid>): Promise<Bid> => {
    if (!data.projectId) throw new Error('projectId required');
    try {
      const response = await http.post(`/projects/${data.projectId}/bids`, {
        coverLetter: data.coverLetter,
        rate: data.rate,
        timeline: data.timeline,
      } as any);
      return transformBid(response);
    } catch (error) {
      console.error('Failed to submit bid:', error);
      throw error;
    }
  },
  hireBid: async (projectId: string, bidId: string): Promise<Bid> => {
    try {
      const response = await http.post(`/projects/${projectId}/bids/${bidId}/hire`, {});
      return transformBid(response);
    } catch (error) {
      console.error('Failed to hire bid:', error);
      throw error;
    }
  },
  rejectBid: async (projectId: string, bidId: string): Promise<Bid> => {
    try {
      const response = await http.post(`/projects/${projectId}/bids/${bidId}/reject`, {});
      return transformBid(response);
    } catch (error) {
      console.error('Failed to reject bid:', error);
      throw error;
    }
  },
};
