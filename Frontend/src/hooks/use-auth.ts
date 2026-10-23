import { useEffect, useState } from 'react';
import { http } from '@/lib/api/http';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'client' | 'freelancer';
  avatar?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      const userData = await http.get('/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await http.post('/auth/login', { email, password });
    localStorage.setItem('token', response.token);
    setUser(response.user);
    return response;
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role: 'client' | 'freelancer';
  }) => {
    const response = await http.post('/auth/register', userData);
    localStorage.setItem('token', response.token);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };
}