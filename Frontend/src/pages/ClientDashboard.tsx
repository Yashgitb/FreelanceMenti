import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DashboardCard from '@/components/ui/DashboardCard';
import { 
  Briefcase, 
  CreditCard, 
  MessageSquare, 
  User, 
  FolderPlus, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Users,
  FileText,
  Calendar,
  Star,
  Activity,
  IndianRupee
} from 'lucide-react';
import { dashboardAPI, DashboardStats, RecentActivity, UpcomingTask } from '@/lib/api/dashboard';
import { projectAPI } from '@/lib/api/projects';

export const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [paymentSummary, setPaymentSummary] = useState({
    totalSpent: 0,
    escrowBalance: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  // Persist tip dismissal state
  useEffect(() => {
    if (user?.id) {
      const dismissed = localStorage.getItem(`proTipDismissed_${user.id}`) === 'true';
      setTipDismissed(dismissed);
    }
  }, [user?.id]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsData, activityData, tasksData, paymentsData] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getRecentActivity(8),
          dashboardAPI.getUpcomingTasks(6),
          dashboardAPI.getPaymentSummary(),
        ]);
        
        setStats(statsData);
        setRecentActivity(activityData);
        setUpcomingTasks(tasksData);
        setPaymentSummary(paymentsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleDismissTip = () => {
    if (user?.id) {
      localStorage.setItem(`proTipDismissed_${user.id}`, 'true');
      setTipDismissed(true);
    }
  };

  const handleProTipClick = () => {
    handleDismissTip();
    navigate('/post-project');
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your projects</p>
        </div>
        <Button onClick={() => navigate('/post-project')} className="bg-primary text-primary-foreground">
          <FolderPlus className="h-4 w-4 mr-2" />
          Post New Project
        </Button>
      </div>

      {/* Quick tip for new clients */}
      {!tipDismissed && stats.totalProjects === 0 && (
        <Card className="border border-dashed border-primary/50 bg-primary/5 mb-6">
          <CardContent className="flex flex-col md:flex-row justify-between items-center py-6 px-6 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Ready to hire top talent?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Post your first project and get proposals from skilled freelancers within hours.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleProTipClick} variant="default">
                Get Started
              </Button>
              <Button onClick={handleDismissTip} variant="ghost" size="icon">
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Active Projects"
          value={loading ? "..." : stats.activeProjects}
          description="Currently in progress"
          icon={Briefcase}
          onClick={() => navigate('/my-projects')}
          className="border-l-4 border-l-blue-500"
        />
        
        <DashboardCard
          title="Total Spent"
          value={loading ? "..." : formatCurrency(stats.totalSpent || 0)}
          description="Across all projects"
          icon={IndianRupee}
          onClick={() => navigate('/payments')}
          className="border-l-4 border-l-green-500"
        />
        
        <DashboardCard
          title="Open Proposals"
          value={loading ? "..." : stats.pendingProposals || 0}
          description="Awaiting your review"
          icon={FileText}
          onClick={() => navigate('/my-projects')}
          className="border-l-4 border-l-orange-500"
        />
        
        <DashboardCard
          title="Hired Freelancers"
          value={loading ? "..." : stats.totalHiredFreelancers || 0}
          description="Working on your projects"
          icon={Users}
          onClick={() => navigate('/messages')}
          className="border-l-4 border-l-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Project Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-2xl font-bold">{stats.totalProjects}</div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <Progress 
                    value={stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.completedProjects} completed
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats.averageProjectBudget ? formatCurrency(stats.averageProjectBudget) : '₹0'}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg. Project Budget</p>
                  <div className="mt-3 space-y-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/my-projects')} className="w-full">
                      View All Projects
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3 animate-pulse">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                      <div className="p-1 rounded-full bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <aside className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Escrow Balance</span>
                <span className="font-medium">{formatCurrency(paymentSummary.escrowBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending Payments</span>
                <span className="font-medium">{formatCurrency(paymentSummary.pendingPayments)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/payments')} className="w-full">
                View All Payments
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {upcomingTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.projectTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Badge>
                        {task.paymentAmount && (
                          <Badge variant="secondary" className="text-xs">
                            {formatCurrency(task.paymentAmount)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No upcoming milestones</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/messages')} className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/completed-projects')} className="w-full justify-start">
                <Star className="h-4 w-4 mr-2" />
                Completed Projects
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings/profile')} className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default ClientDashboard;