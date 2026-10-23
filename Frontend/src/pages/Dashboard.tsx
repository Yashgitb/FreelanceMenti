import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardCard from '@/components/ui/DashboardCard';
import { Briefcase, CreditCard, MessageSquare, User, FolderPlus } from 'lucide-react';

// Sidebar is provided by SidebarLayout at the route level — do not render it here to avoid duplication

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Redirect to role-specific dashboard
  useEffect(() => {
    if (user?.role === 'client') {
      navigate('/dashboard/client', { replace: true });
    } else if (user?.role === 'freelancer') {
      navigate('/dashboard/freelancer', { replace: true });
    }
  }, [user?.role, navigate]);

  // Show loading while redirecting
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
      <h2 className="text-xl font-semibold mb-4">Loading Dashboard...</h2>
      <p className="text-muted-foreground">Redirecting to your personalized dashboard...</p>
    </div>
  );
};

export default Dashboard;