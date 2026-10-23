import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  IndianRupee,
  ChevronRight,
  Info
} from 'lucide-react';
import { http } from '@/lib/api/http';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';

interface CounterOffer {
  _id: string;
  amount: number;
  message?: string;
  createdBy: 'client' | 'freelancer';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Bid {
  _id: string;
  project: {
    _id: string;
    title: string;
  };
  freelancer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  rate: number;
  status: string;
  counterOffers: CounterOffer[];
  currentCounterOffer?: string;
  lastActionBy?: 'client' | 'freelancer';
  isRead: boolean;
  updatedAt: string;
}

export default function Messages() {
  const [unreadBids, setUnreadBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth check to finish so we have the correct token/role
    if (!authLoading) {
      if (!user) {
        setLoading(false);
        setError('You must be logged in to view messages.');
        return;
      }
      fetchUnreadUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?._id]);

  const fetchUnreadUpdates = async () => {
    try {
      const response = await http.get('/bids/unread');
      setUnreadBids(response);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch unread updates:', error);
      // Capture error message for UI
      setError(error?.message || String(error));
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (bidId: string) => {
    try {
      await http.post(`/bids/${bidId}/mark-read`);
      setUnreadBids(prev => prev.filter(b => b._id !== bidId));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const respondToCounterOffer = async (projectId: string, bidId: string, status: 'accepted' | 'rejected') => {
    try {
      await http.post(`/projects/${projectId}/bids/${bidId}/counter-offer/respond`, { status });
      toast({
        title: 'Success',
        description: `Counter offer ${status}`,
      });
      fetchUnreadUpdates();
    } catch (error) {
      console.error('Failed to respond to counter offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to respond to counter offer',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'counter_offered':
        return <Badge variant="secondary">Counter Offer</Badge>;
      case 'accepted':
        return <Badge variant="default">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'hired':
        return <Badge variant="default">Hired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => {
            setLoading(true);
            setError(null);
            fetchUnreadUpdates();
          }}>Retry</Button>
          <Button variant="ghost" className="ml-2" onClick={() => window.location.assign('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Counter offers and bid updates</p>
      </div>

      {unreadBids.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No new messages. Counter offers and bid updates will appear here.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {unreadBids.map((bid) => {
            const latestOffer = Array.isArray(bid.counterOffers) && bid.counterOffers.length > 0 ? bid.counterOffers[bid.counterOffers.length - 1] : undefined;
            const isClient = user?.role === 'client';
            const canRespond = latestOffer?.createdBy !== (isClient ? 'client' : 'freelancer');

            return (
              <Card key={bid._id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={bid.freelancer?.avatar} />
                        <AvatarFallback>{bid.freelancer?.name ? bid.freelancer.name[0] : '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg leading-tight">{bid.project?.title || 'Untitled project'}</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground mt-0">
                              {isClient ? `From ${bid.freelancer?.name || 'Unknown'}` : 'From Client'}
                            </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-start">
                      {getStatusBadge(bid.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {latestOffer && (
                      <>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">₹{latestOffer.amount}</Badge>
                            <div className="text-sm font-medium">Counter Offer</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(latestOffer.createdAt), { addSuffix: true })}</div>
                        </div>
                        {latestOffer.message && (
                          <p className="text-muted-foreground mt-2 line-clamp-3">{latestOffer.message}</p>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="space-x-2">
                        {canRespond && latestOffer?.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => respondToCounterOffer(bid.project._id, bid._id, 'accepted')}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => respondToCounterOffer(bid.project._id, bid._id, 'rejected')}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                        {bid.status === 'hired' && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/workspace/${bid.project._id}`)}
                          >
                            Go to Workspace
                          </Button>
                        )}
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/projects/${bid.project._id}/bids/${bid._id}`)}
                        >
                          View Negotiation
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(bid._id)}
                        >
                          Mark as Read
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}