import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// We'll use native <select> for simpler dropdown appearance here
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  Circle, 
  PlayCircle,
  AlertCircle,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  IndianRupee,
  DollarSign,
  Star,
  CreditCard
} from 'lucide-react';
import { timelineAPI, TimelineItem, TimelineStats, CreateTimelineItemData } from '@/lib/api/timeline';
import { projectAPI } from '@/lib/api/projects';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { toast } from '@/hooks/use-toast';

interface TimelineProps {
  projectId: string;
}

export default function Timeline({ projectId }: TimelineProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Role-based access control:
  // - Only clients can create timeline items, change status, and manage payments
  // - Freelancers can only view timeline items and their status (read-only)
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [projectInfo, setProjectInfo] = useState<any | null>(null);
  const [newItem, setNewItem] = useState<CreateTimelineItemData>({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    status: 'pending'
  });
  const [escrowChecked, setEscrowChecked] = useState(false);

  // Open escrow input by default when a client opens the create dialog
  useEffect(() => {
    if (isCreateDialogOpen) {
      setEscrowChecked(!!(user && user.role === 'client'));
    } else {
      // reset when dialog closes
      setEscrowChecked(false);
      setNewItem({
        ...newItem,
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        status: 'pending',
        paymentAmount: undefined
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateDialogOpen]);
  

  useEffect(() => {
    fetchTimeline();
    fetchStats();
    // fetch project info for validation (remaining budget / hired rate)
    const fetchProjectInfo = async () => {
      try {
        const p = await projectAPI.getProjectById(projectId);
        setProjectInfo(p);
      } catch (err) {
        console.error('Failed to fetch project info for timeline validation', err);
      }
    };
    fetchProjectInfo();
  }, [projectId]);

  const fetchTimeline = async () => {
    try {
      const data = await timelineAPI.getProjectTimeline(projectId);
      setTimeline(data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timeline',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await timelineAPI.getTimelineStats(projectId);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.title.trim()) return;

    try {
      // Validate paymentAmount against project remaining budget/hired rate
      if (newItem.paymentAmount && projectInfo) {
        const totalPaid = projectInfo.totalPaid || 0;
        const hiredRate = projectInfo.hiredBidRate;
        const budgetMax = projectInfo.budget?.max || 0;
        const allowedRemaining = typeof hiredRate === 'number' && hiredRate > 0
          ? Math.max(0, hiredRate - totalPaid)
          : Math.max(0, budgetMax - totalPaid);

        if (newItem.paymentAmount > allowedRemaining) {
          toast({
            title: 'Invalid payment amount',
            description: `Escrow amount exceeds remaining project allowance (₹${allowedRemaining}). Reduce amount and try again.`,
            variant: 'destructive',
          });
          return;
        }
      }

      await timelineAPI.createTimelineItem(projectId, newItem);
      setNewItem({
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        status: 'pending'
      });
      setIsCreateDialogOpen(false);
      fetchTimeline();
      fetchStats();
      toast({
        title: 'Success',
        description: 'Timeline item created successfully',
      });
    } catch (error) {
      console.error('Error creating timeline item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create timeline item',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (itemId: string, status: TimelineItem['status']) => {
    try {
      await timelineAPI.updateTimelineItem(itemId, { status });
      fetchTimeline();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  

  const getStatusIcon = (status: TimelineItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: TimelineItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'milestone':
        return <Calendar className="h-4 w-4" />;
      case 'deadline':
        return <Clock className="h-4 w-4" />;
      case 'note':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Timeline</CardTitle>
          {user?.role === 'client' && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Timeline Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Enter title..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter description..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select
                      className="w-full border rounded px-2 h-8"
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                    >
                      <option value="task">Task</option>
                      <option value="milestone">Milestone</option>
                      <option value="note">Note</option>
                      <option value="deadline">Deadline</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <select
                      className="w-full border rounded px-2 h-8"
                      value={newItem.priority}
                      onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                {user?.role === 'client' && (
                <div>
                  <div className="flex items-center space-x-2">
                    <input id="escrow" type="checkbox" checked={escrowChecked} onChange={(e) => setEscrowChecked(e.target.checked)} />
                    <label htmlFor="escrow" className="text-sm font-medium">Escrow payment for this task</label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Check to escrow a payment for the assigned freelancer. Payments are released on task completion.</p>
                  {escrowChecked && (
                    <div className="mt-2">
                      <label className="text-sm font-medium">Amount (₹)</label>
                      <Input
                        type="number"
                        value={newItem.paymentAmount ?? ''}
                        onChange={(e) => setNewItem({ ...newItem, paymentAmount: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Amount in ₹"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optional escrow amount. Available remaining: {projectInfo ? `₹${(() => {
                        const totalPaid = projectInfo.totalPaid || 0;
                        if (typeof projectInfo.hiredBidRate === 'number' && projectInfo.hiredBidRate > 0) {
                          return Math.max(0, projectInfo.hiredBidRate - totalPaid);
                        }
                        return Math.max(0, (projectInfo.budget?.max || 0) - totalPaid);
                      })()}` : '—'}</p>
                    </div>
                  )}
                </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateItem}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedItems}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.progressPercentage}%</div>
              <div className="text-sm text-muted-foreground">Progress</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No timeline items yet</p>
                <p className="text-sm">Create your first timeline item to get started</p>
              </div>
            ) : (
              timeline.map((item) => (
                <div key={item._id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(item.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{item.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeIcon(item.type)}
                          <span className="ml-1">{item.type}</span>
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </Badge>
                        {item.paymentAmount ? (
                          <Badge className="text-xs ml-2" variant={item.paymentReleased ? 'default' : 'secondary'}>
                            <IndianRupee className="h-3 w-3 inline-block mr-1" />
                            ₹{item.paymentAmount} {item.paymentReleased ? '• Paid' : '• Escrow'}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center space-x-2">
                        {user?.role === 'client' ? (
                          <select
                            className="w-32 h-8 border rounded px-2"
                            value={item.status}
                            onChange={(e) => handleUpdateStatus(item._id, e.target.value as any)}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <Badge variant={
                            item.status === 'completed' ? 'default' : 
                            item.status === 'in_progress' ? 'secondary' : 
                            item.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {item.status === 'pending' ? 'Pending' :
                             item.status === 'in_progress' ? 'In Progress' :
                             item.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </Badge>
                        )}
                        
                        {/* Payment controls removed — use create dialog to escrow and status change to release payments */}
                      </div>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{item.createdBy.name}</span>
                        </div>
                        {item.assignedTo && (
                          <div className="flex items-center space-x-1">
                            <span>Assigned to:</span>
                            <span>{item.assignedTo.name}</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {formatDate(item.dueDate)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(item.createdAt)}</span>
                      </div>
                    </div>
                    
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Tag className="h-3 w-3" />
                        {item.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {item.comments && item.comments.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">
                          {item.comments.length} comment{item.comments.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Legacy payment dialogs removed — payments are created at task creation and released on status change */}
    </Card>
  );
}
