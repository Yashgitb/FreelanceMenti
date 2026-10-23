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
  Search, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Target,
  Star,
  Activity,
  Eye,
  CheckCircle,
  Calendar,
  IndianRupee
} from 'lucide-react';
import { dashboardAPI, DashboardStats, RecentActivity, UpcomingTask } from '@/lib/api/dashboard';

export const FreelancerDashboard = () => {
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
    totalEarned: 0,
    pendingPayouts: 0,
    availableBalance: 0,
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
    navigate('/settings/profile');
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  
  const profileCompletionScore = 85; // This would come from profile analysis
  const responseRate = stats.successRate || 95;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground mt-1">Let's find your next great project</p>
        </div>
        <Button onClick={() => navigate('/projects')} className="bg-primary text-primary-foreground">
          <Search className="h-4 w-4 mr-2" />
          Browse Projects
        </Button>
      </div>

      {/* Optimization tip for freelancers */}
      {!tipDismissed && (profileCompletionScore < 90 || stats.activeContracts === 0) && (
        <Card className="border border-dashed border-primary/50 bg-primary/5 mb-6">
          <CardContent className="flex flex-col md:flex-row justify-between items-center py-6 px-6 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Boost your profile visibility</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {profileCompletionScore < 90 
                    ? `Complete your profile (${profileCompletionScore}%) to get more project invitations.`
                    : 'Submit proposals to quality projects to increase your success rate.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleProTipClick} variant="default">
                {profileCompletionScore < 90 ? 'Complete Profile' : 'Find Projects'}
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
          title="Active Contracts"
          value={loading ? "..." : stats.activeContracts || 0}
          description="Currently working on"
          icon={Briefcase}
          onClick={() => navigate('/tasks/kanban')}
          className="border-l-4 border-l-blue-500"
        />
        
        <DashboardCard
          title="Total Earned"
          value={loading ? "..." : formatCurrency(stats.totalEarnings || 0)}
          description="Across all projects"
          icon={IndianRupee}
          onClick={() => navigate('/payments')}
          className="border-l-4 border-l-green-500"
        />
        
        <DashboardCard
          title="Available Jobs"
          value={loading ? "..." : stats.availableJobs || 0}
          description="Matching your skills"
          icon={Search}
          onClick={() => navigate('/projects')}
          className="border-l-4 border-l-orange-500"
        />
        
        <DashboardCard
          title="Success Rate"
          value={loading ? "..." : `${responseRate}%`}
          description="Proposal success rate"
          icon={TrendingUp}
          onClick={() => navigate('/settings/profile')}
          className="border-l-4 border-l-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          
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
                        {activity.type === 'payment_released' ? (
                          <IndianRupee className="h-4 w-4 text-green-600" />
                        ) : activity.type === 'hired' ? (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Activity className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        {activity.metadata?.amount && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {formatCurrency(activity.metadata.amount)}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/projects')} className="mt-2">
                    Browse Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <aside className="space-y-6">
          {/* Earnings Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(paymentSummary.availableBalance)}
                </div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-medium">{formatCurrency(paymentSummary.pendingPayouts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="font-medium">{formatCurrency(stats.totalEarnings || 0)}</span>
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => navigate('/payments')} className="w-full">
                View Payment History
              </Button>
            </CardContent>
          </Card>

          {/* My Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                My Tasks
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
                  {upcomingTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="border-l-2 border-primary/30 pl-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{task.title}</p>
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : 
                                  task.priority === 'medium' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{task.projectTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => navigate('/tasks/kanban')} className="w-full mt-3">
                    View All Tasks
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No active tasks</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/projects')} className="mt-2">
                    Find Work
                  </Button>
                </div>
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
                Portfolio
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

export default FreelancerDashboard;