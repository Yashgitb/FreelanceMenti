import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { http } from '@/lib/api/http';
import { FreelancerProfile } from '@/components/FreelancerProfile';

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
    budget: {
      min: number;
      max: number;
    };
  };
  freelancer: {
    _id: string;
    name: string;
    avatar?: string;
    profile: {
      bio?: string;
      experience?: string;
      hourlyRate?: number;
      skills: string[];
      location?: {
        city?: string;
        country?: string;
      };
      portfolio: Array<{
        title: string;
        description: string;
        imageUrl?: string;
        projectUrl?: string;
        technologies: string[];
      }>;
    };
  };
  rate: number;
  coverLetter: string;
  status: string;
  counterOffers: CounterOffer[];
  currentCounterOffer?: string;
  lastActionBy?: 'client' | 'freelancer';
  createdAt: string;
}

export default function BidWorkspace() {
  const { projectId, bidId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [counterBidForm, setCounterBidForm] = useState({
    amount: '',
    message: '',
  });
  const [counterBidDialogOpen, setCounterBidDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchBidDetails();
  }, [projectId, bidId]);

  const fetchBidDetails = async () => {
    try {
      const response = await http.get(`/projects/${projectId}/bids/${bidId}`);
      setBid(response);
    } catch (error) {
      console.error('Failed to fetch bid details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bid details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the latest bid amount
  const getLatestBidAmount = () => {
    if (!bid) return 0;
    
    // If there are counter offers, get the latest one
    if (bid.counterOffers && bid.counterOffers.length > 0) {
      const sortedOffers = [...bid.counterOffers].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return sortedOffers[0].amount;
    }
    
    // Otherwise use the original bid amount
    return bid.rate;
  };

  // Helper function to validate counter offer logic
  const validateCounterOffer = (newAmount: number): { isValid: boolean; message?: string } => {
    if (!bid || !user) return { isValid: false, message: 'Missing required data' };
    
    const latestAmount = getLatestBidAmount();
    const userRole = user.role;
    
    // Basic validation
    if (newAmount <= 0) {
      return { isValid: false, message: 'Amount must be greater than zero' };
    }
    
    // Check against project budget limits
    if (newAmount < bid.project.budget.min) {
      return { isValid: false, message: `Amount cannot be below project minimum budget (₹${bid.project.budget.min.toLocaleString()})` };
    }
    
    if (newAmount > bid.project.budget.max) {
      return { isValid: false, message: `Amount cannot exceed project maximum budget (₹${bid.project.budget.max.toLocaleString()})` };
    }
    
    // Role-specific validation logic
    if (userRole === 'client') {
      // Clients should generally negotiate down (but allow same amount)
      if (newAmount > latestAmount) {
        return { 
          isValid: false, 
          message: `As a client, you should negotiate towards a lower amount. Current offer is ₹${latestAmount.toLocaleString()}` 
        };
      }
    } else if (userRole === 'freelancer') {
      // Freelancers can defend their rate but should be reasonable
      const increasePercentage = ((newAmount - latestAmount) / latestAmount) * 100;
      
      if (increasePercentage > 25) { // Allow up to 25% increase
        return { 
          isValid: false, 
          message: `Counter offer increase seems excessive (${increasePercentage.toFixed(1)}% increase). Consider a more reasonable adjustment.` 
        };
      }
    }
    
    return { isValid: true };
  };

  const makeCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !bidId) return;

    const newAmount = parseFloat(counterBidForm.amount);
    
    // Validate the counter offer
    const validation = validateCounterOffer(newAmount);
    if (!validation.isValid) {
      toast({
        title: 'Invalid Counter Offer',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    try {
      await http.post(`/projects/${projectId}/bids/${bidId}/counter-offer`, {
        amount: newAmount,
        message: counterBidForm.message
      });
      
      toast({
        title: 'Counter offer sent',
        description: 'The other party will be notified of your counter offer.',
      });
      
      setCounterBidDialogOpen(false);
      fetchBidDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send counter offer. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const respondToCounterOffer = async (status: 'accepted' | 'rejected') => {
    try {
      await http.post(`/projects/${projectId}/bids/${bidId}/counter-offer/respond`, { status });
      toast({
        title: 'Success',
        description: `Counter offer ${status}`,
      });
      fetchBidDetails();
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

  if (!bid) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Bid not found or you don't have permission to view it.</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClient = user?.role === 'client';
  const latestOffer = bid.counterOffers?.[bid.counterOffers.length - 1];
  const canRespond = latestOffer?.createdBy !== (isClient ? 'client' : 'freelancer');

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
            </Button>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              All Projects
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{bid.project.title}</h1>
          <p className="text-muted-foreground">Bid Negotiation Workspace</p>
        {/* </div>
        <Button variant="outline" onClick={() => setProfileDialogOpen(true)}>
          View Freelancer Profile
        </Button>
      </div> */}
      </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bid Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bid Details</CardTitle>
            <CardDescription>Original bid and counter-offers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Original Bid */}
            <div className="border p-4 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={bid.freelancer.avatar} />
                    <AvatarFallback>{bid.freelancer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{bid.freelancer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Original Bid • ₹{bid.rate}
                    </div>
                  </div>
                </div>
                {getStatusBadge(bid.status)}
              </div>
              <p className="text-sm text-muted-foreground">{bid.coverLetter}</p>
            </div>

            <Separator />

            {/* Counter-Offers Thread */}
            {bid.counterOffers?.length > 0 ? (
              <div className="space-y-4">
                {bid.counterOffers.map((offer, index) => (
                  <div key={offer._id} className="border p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Counter offer by {offer.createdBy === 'client' ? 'Client' : bid.freelancer.name}
                        </div>
                        <div className="font-medium">₹{offer.amount}</div>
                      </div>
                      <Badge variant={
                        offer.status === 'accepted' ? 'default' :
                        offer.status === 'rejected' ? 'destructive' :
                        'secondary'
                      }>
                        {offer.status}
                      </Badge>
                    </div>
                    {offer.message && (
                      <p className="text-sm text-muted-foreground mt-2">{offer.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
                    </p>
                    {canRespond && index === bid.counterOffers.length - 1 && offer.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => respondToCounterOffer('accepted')}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respondToCounterOffer('rejected')}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No counter-offers yet</p>
            )}

            {/* Status Message */}
            {bid.status === 'hired' && (
              <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Bid Accepted - Project Hired</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>This bid has been accepted. The project workspace is now unlocked. Navigate to the workspace to start collaboration.</p>
                    </div>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/workspace/${bid.project._id}`)}
                      >
                        Go to Workspace
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* New Counter Offer Button - Only show if not hired */}
            {bid.status !== 'hired' && bid.status !== 'rejected' && !(bid.project as any)?.hiredBid && (
              <Button
                className="w-full"
                onClick={() => {
                  setCounterBidForm({
                    amount: String(latestOffer?.amount || bid.rate),
                    message: '',
                  });
                  setValidationError(null);
                  setCounterBidDialogOpen(true);
                }}
              >
                Make Counter Offer
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Project Budget Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Minimum:</span>
                <span className="font-medium">₹{bid.project.budget.min}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Maximum:</span>
                <span className="font-medium">₹{bid.project.budget.max}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Bid:</span>
                <span className="font-medium">₹{latestOffer?.amount || bid.rate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Counter Offer Dialog */}
      <Dialog open={counterBidDialogOpen} onOpenChange={setCounterBidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make Counter Offer</DialogTitle>
            <DialogDescription>
              Propose a new rate for this bid. The other party will be notified and can accept or decline.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={makeCounterOffer}>
            <div className="space-y-4 my-4">
              {/* Guidance based on user role */}
              {user && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {user.role === 'client' ? (
                      <>
                        💡 <strong>Tip:</strong> As a client, negotiate towards a fair rate that fits your budget. 
                        Current offer: ₹{getLatestBidAmount().toLocaleString()}
                      </>
                    ) : (
                      <>
                        💡 <strong>Tip:</strong> As a freelancer, you can defend your rate but be reasonable. 
                        Consider the project value and your expertise. Current offer: ₹{getLatestBidAmount().toLocaleString()}
                      </>
                    )}
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={bid.project.budget.min}
                  max={bid.project.budget.max}
                  value={counterBidForm.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCounterBidForm(prev => ({ ...prev, amount: value }));
                    
                    // Real-time validation
                    if (value && !isNaN(parseFloat(value))) {
                      const validation = validateCounterOffer(parseFloat(value));
                      setValidationError(validation.isValid ? null : validation.message || null);
                    } else {
                      setValidationError(null);
                    }
                  }}
                  className={validationError ? 'border-destructive' : ''}
                  required
                />
                <div className="space-y-1 mt-1">
                  <p className="text-xs text-muted-foreground">
                    Project budget: ₹{bid.project.budget.min.toLocaleString()} - ₹{bid.project.budget.max.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Latest offer: ₹{getLatestBidAmount().toLocaleString()}
                  </p>
                  {validationError && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ {validationError}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Explain why you're proposing this rate..."
                  value={counterBidForm.message}
                  onChange={(e) => setCounterBidForm(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!!validationError || !counterBidForm.amount}>
                Send Counter Offer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Freelancer Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Freelancer Profile</DialogTitle>
          </DialogHeader>
          {bid.freelancer && (
            <FreelancerProfile freelancer={{
              _id: bid.freelancer._id,
              name: bid.freelancer.name,
              avatar: bid.freelancer.avatar,
              profile: bid.freelancer.profile
            }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}