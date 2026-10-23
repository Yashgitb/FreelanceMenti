import { http } from './http';

export interface Profile {
  _id?: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'client' | 'freelancer';
  };
  bio?: string;
  skills: string[];
  experience: 'Entry' | 'Intermediate' | 'Expert';
  hourlyRate?: number;
  portfolio: Array<{
    title: string;
    description: string;
    imageUrl: string;
    projectUrl: string;
    technologies: string[];
  }>;
  socialLinks: {
    website?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
  location: {
    city?: string;
    country?: string;
  };
  // Recent public ratings (when fetching a public profile)
  recentRatings?: Array<{
    rating: number;
    review?: string;
    categories?: { [key: string]: number };
    createdAt: string;
    client: {
      name: string;
      avatar?: string;
    };
  }>;
  availability: 'Available' | 'Busy' | 'Unavailable';
  languages: Array<{
    name: string;
    proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Native';
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startYear: number;
    endYear?: number;
    current: boolean;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
}

export const profileAPI = {
  // Get current user's profile
  getProfile: async (): Promise<Profile> => {
    // http.get returns parsed JSON directly
    const data = await http.get('/profile');
    return data as Profile;
  },

  // Update profile
  updateProfile: async (profileData: Partial<Profile>): Promise<Profile> => {
    const data = await http.put('/profile', profileData);
    return data as Profile;
  },

  // Upload profile image
  uploadProfileImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    
    // Let the browser set the Content-Type (including boundary) for FormData
    const data = await http.post('/profile/upload-image', formData);
    return data as { imageUrl: string };
  },

  // Get public profile
  getPublicProfile: async (userId: string): Promise<Profile> => {
    const data = await http.get(`/profile/public/${userId}`);
    return data as Profile;
  },
};
