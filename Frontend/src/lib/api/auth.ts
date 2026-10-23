import { http } from './http';

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    return http.post('/auth/login', credentials);
  },
  register: async (data: { name: string; email: string; password: string; role: 'freelancer' | 'client' }) => {
    return http.post('/auth/register', data);
  },
};
