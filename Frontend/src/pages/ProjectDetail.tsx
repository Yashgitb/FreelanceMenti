import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '@/store';
import { fetchProjectDetail } from '@/store/slices/projectSlice';
import { fetchBidsByProject, submitBid, hireBid, rejectBid } from '@/store/slices/bidSlice';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, DollarSign, Users, Briefcase, Award, Star, MoveLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import Timeline from '@/components/Timeline';
import { projectAPI } from '@/lib/api/projects';
import { paymentsAPI } from '@/lib/api/payments';
import { profileAPI } from '@/lib/api/profile';
import { FreelancerProfile } from '@/components/FreelancerProfile';
import {IndianRupee} from 'lucide-react';
import { ArrowBigLeft, ArrowLeft } from 'lucide-react';



export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const { detail: project } = useSelector((state: RootState) => state.project);
  const selectBidsByProjectId = createSelector(
    [(state: RootState) => state.bid.byProjectId, (_: RootState, id: string | undefined) => id],
    (byProjectId, id) => (id && byProjectId[id]) ? byProjectId[id] : []
  );
  const bids = useSelector((state: RootState) => selectBidsByProjectId(state, id));
  const { user } = useSelector((state: RootState) => state.auth);

  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedFreelancerProfile, setSelectedFreelancerProfile] = useState<any | null>(null);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [bidForm, setBidForm] = useState({
    coverLetter: '',
    rate: '',
    timeline: '2-4 weeks',
  });
  const [lastSubmittedBidId, setLastSubmittedBidId] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [projectRatings, setProjectRatings] = useState<any>({ ratings: [], averageRating: 0, totalRatings: 0 });
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    finalRating: 5,
    review: '',
    categories: {
      communication: 5,
      quality: 5,
      timeliness: 5,
      professionalism: 5,
    }
  });

  const handleConfirmComplete = async () => {
    if (!id) return;
    try {
      const result = await projectAPI.completeProject(id, completeForm);
      setCompleteConfirmOpen(false);
      toast({ title: 'Project Completed!', description: result.message });
      if (result.finalPayment) {
        toast({ title: 'Final Payment', description: `Final payment of ₹${result.finalPayment.amount} is being processed.` });
      }
      dispatch(fetchProjectDetail(id));
    } catch (error: any) {
      console.error('Error completing project:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to complete project',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchProjectDetail(id));
      dispatch(fetchBidsByProject(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    // When project data is loaded and project is completed, fetch payments and ratings for display
    const loadExtras = async () => {
      if (!id || !project) return;
  if ((project as any).status === 'completed') {
        setPaymentsLoading(true);
        try {
          const p = await paymentsAPI.getProjectPayments(id);
          setPayments(p);
        } catch (err) {
          // ignore
        } finally {
          setPaymentsLoading(false);
        }

        try {
          const r = await projectAPI.getProjectRatings(id);
          setProjectRatings(r);
        } catch (err) {
          // ignore
        }
      }
    };
    loadExtras();
  }, [id, project]);

  const handleSubmitBid = async () => {
    // Client-side validation: ensure bid rate falls within project budget when available
    const parsedRate = parseFloat(bidForm.rate as any);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      toast({ title: 'Invalid rate', description: 'Please enter a valid positive rate', variant: 'destructive' });
      return;
    }
    if (project && project.budget && (typeof project.budget.min === 'number' || typeof project.budget.max === 'number')) {
      const min = typeof project.budget.min === 'number' ? project.budget.min : -Infinity;
      const max = typeof project.budget.max === 'number' ? project.budget.max : Infinity;
      if (parsedRate < min || parsedRate > max) {
        toast({ title: 'Rate out of range', description: `Please submit a bid between ₹${min} and ₹${max}`, variant: 'destructive' });
        return;
      }
    }

    try {
      const returned = await dispatch(submitBid({
        projectId: id,
        coverLetter: bidForm.coverLetter,
        rate: parsedRate,
        timeline: bidForm.timeline,
      })).unwrap();

      toast({
        title: 'Bid Submitted!',
        description: 'Your bid has been sent to the client.',
      });
      setBidModalOpen(false);
      setBidForm({ coverLetter: '', rate: '', timeline: '2-4 weeks' });
      // keep last submitted bid id so freelancer can immediately open negotiation
      if (returned && returned.id) {
        setLastSubmittedBidId(returned.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to submit bid. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleHireClick = (bidId: string) => {
    setSelectedBidId(bidId);
    setHireDialogOpen(true);
  };

  const handleConfirmHire = async () => {
    if (!selectedBidId || !id) return;

    try {
      await dispatch(hireBid({ projectId: id, bidId: selectedBidId })).unwrap();

      toast({
        title: 'Freelancer Hired!',
        description: 'The freelancer has been notified and your project status has been updated.',
      });
      setHireDialogOpen(false);
      setSelectedBidId(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to hire freelancer. Please try again.',
        variant: 'destructive',
      });
    }
  };

  

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const hiredBids = bids.filter((b) => b.status === 'hired');
  const hasHiredFreelancers =
    hiredBids.length > 0 ||
    !!project.hiredBid ||
    (Array.isArray((project as any).hiredFreelancers) && (project as any).hiredFreelancers.length > 0);

  const isClientOwner =
    user?.role === 'client' &&
    (String(project.client?.id) === String(user?.id) || String(project.client) === String(user?.id));
  const isHiredFreelancer =
    user?.role === 'freelancer' &&
    bids.some((b) => String(b.freelancerId) === String(user?.id) && b.status === 'hired');

  const workspaceEnabled = Boolean(hasHiredFreelancers && (isClientOwner || isHiredFreelancer));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <MoveLeft className='h-4 w-4' /> 
          <span className="ml-2">Back to Projects</span>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-3xl mb-2">{project.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Posted {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {project.urgency && (
                      <Badge variant={project.urgency === 'high' ? 'destructive' : 'secondary'}>
                        {project.urgency} priority
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Project Description</h3>
                    <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {(project.skills || []).map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      { <IndianRupee className='h-4 w-4 mr-1' /> }
                      {/* <DollarSign className="h-5 w-5" /> */}
                      <div>
                        <div className="text-xs">Budget</div>
                        <div className="font-semibold text-foreground">
                        <span>
                       {project.budget?.min >= 1000 ? `₹${project.budget?.min/1000}k` : `₹${project.budget?.min}`} -
                       {project.budget?.max >= 1000 ? `₹${project.budget?.max/1000}k` : `₹${project.budget?.max}`}
                        </span>
                          {/* ₹{project.budget?.min}K-₹{project.budget?.max}K */}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-5 w-5" />
                      <div>
                        <div className="text-xs">Bids</div>
                        <div className="font-semibold text-foreground">{project.bids}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-5 w-5" />
                      <div>
                        <div className="text-xs">Status</div>
                        <div className="font-semibold text-foreground capitalize">{project.status}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bids Section (hidden for completed projects) */}
            {(project as any).status !== 'completed' && bids.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Bids ({bids.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bids.map((bid) => (
                      <div key={bid.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar>
                              <AvatarImage src={bid.freelancerAvatar} />
                              <AvatarFallback>{bid.freelancerName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{bid.freelancerName ? bid.freelancerName : (bid.freelancerId ? `Freelancer (${bid.freelancerId})` : 'Unknown Freelancer')}</div>
                              <div className="text-sm text-muted-foreground">
                                ₹{bid.rate || 0} • {bid.timeline || 'Not specified'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={bid.status === 'hired' ? 'default' : bid.status === 'accepted' ? 'default' : 'outline'}>
                              {bid.status}
                            </Badge>
                            {user?.role === 'client' && bid.status === 'pending' && (
                              <Button size="sm" onClick={() => handleHireClick(bid.id)}>
                                Hire
                              </Button>
                            )}
                            {user?.role === 'client' && bid.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => dispatch(rejectBid({ projectId: id!, bidId: bid.id }))}>
                                Reject
                              </Button>
                            )}
                            {/* Negotiate action for client or the bidding freelancer */}
                            {(user?.role === 'client' || (user?.role === 'freelancer' && bid.freelancerId === user.id)) && bid.status !== 'hired' && (
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${id}/bids/${bid.id}`)}>
                                Negotiate
                              </Button>
                            )}
                            {user?.role === 'client' && (
                              <Button size="sm" variant="ghost" onClick={async () => {
                                try {
                                  const profile = await profileAPI.getPublicProfile(bid.freelancerId);
                                  setSelectedFreelancerProfile({
                                    _id: profile.user._id,
                                    name: profile.user.name,
                                    avatar: profile.user.avatar,
                                    profile: {
                                      bio: profile.bio,
                                      experience: profile.experience,
                                      hourlyRate: profile.hourlyRate,
                                      skills: profile.skills || [],
                                      location: profile.location || {},
                                      portfolio: profile.portfolio || []
                                    },
                                    recentRatings: profile.recentRatings || []
                                  });
                                  setProfileDialogOpen(true);
                                } catch (err) {
                                  toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
                                }
                              }}>
                                View Profile
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{bid.coverLetter || 'No cover letter provided'}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Timeline Section - Only show if user has access to project and project is not completed (completed view has its own summary) */}
            {workspaceEnabled && (project as any).status !== 'completed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="space-y-4">
                  {user?.role === 'client' && (
                    <Card>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="font-semibold">Task payments</div>
                            <div className="text-sm text-muted-foreground">When creating timeline tasks you can optionally escrow a payment for the assigned freelancer. Payments are released automatically when tasks are marked completed.</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                    <Timeline projectId={id!} />
                    {/* If project is completed, show finished-project UI: timeline (read-only), payments and reviews */}
                    {(project as any).status === 'completed' && (
                      <div className="space-y-4 mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Completed Project Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <div className="font-medium">Timeline</div>
                                <div className="text-sm text-muted-foreground">Read-only timeline for this completed project</div>
                                <div className="mt-3">
                                  <Timeline projectId={id!} />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">Payments</div>
                                    <div className="text-sm text-muted-foreground">All payments associated with this project</div>
                                  </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {paymentsLoading ? (
                                    <div className="text-sm text-muted-foreground">Loading payments...</div>
                                  ) : payments.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">No payments found for this project.</div>
                                  ) : (
                                    payments.map((p) => (
                                      <div key={p._id} className="p-3 border rounded flex items-center justify-between">
                                        <div>
                                          <div className="font-medium">₹{p.amount} • {p.paymentType}</div>
                                          <div className="text-xs text-muted-foreground">{p.timelineItem?.title || p.description} • {new Date(p.createdAt).toLocaleString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button size="sm" variant="outline" onClick={() => { setSelectedPayment(p); setPaymentDialogOpen(true); }}>
                                            View Details
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">Reviews</div>
                                    <div className="text-sm text-muted-foreground">Client & freelancer reviews for this project</div>
                                  </div>
                                  <div>
                                    <Button size="sm" variant="ghost" onClick={() => setReviewsDialogOpen(true)}>View Reviews</Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={project.client?.avatar} />
                      <AvatarFallback>{project.client?.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{project.client?.name || 'Unknown Client'}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.client?.bio || 'No bio available'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Projects Posted</span>
                      <span className="font-semibold">{project.client?.totalProjects || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hire Rate</span>
                      <span className="font-semibold">{project.client?.hireRate || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Payments & Reviews quick access for completed projects */}
            {(project as any).status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Payments & Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Total paid</div>
                          <div className="font-semibold">₹{project.totalPaid || 0}</div>
                        </div>
                        <div>
                          <Button size="sm" variant="outline" onClick={() => setPaymentDialogOpen(true)}>View Payments</Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Reviews</div>
                          <div className="font-semibold">{project.ratingCount || projectRatings.totalRatings || 0} reviews</div>
                        </div>
                        <div>
                          <Button size="sm" variant="outline" onClick={() => setReviewsDialogOpen(true)}>View Reviews</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Remaining balance / project payments */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Remaining Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">Amount remaining to be paid for this project</div>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const totalPaid = project.totalPaid || 0;
                      if (typeof project.hiredBidRate === 'number' && project.hiredBidRate > 0) {
                        return `₹${Math.max(0, project.hiredBidRate - totalPaid)}`;
                      }
                      const budgetMax = project.budget?.max || 0;
                      return `₹${Math.max(0, budgetMax - totalPaid)}`;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">This includes escrowed and completed payments.</div>
                </CardContent>
              </Card>
            </motion.div>

            {user?.role === 'freelancer' && !bids.some(bid => bid.freelancerId === user.id && bid.status === 'hired') && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <Dialog open={bidModalOpen} onOpenChange={setBidModalOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          Submit a Bid
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Submit Your Bid</DialogTitle>
                          <DialogDescription>
                            Make your bid stand out — include proposed milestones and timeline
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="coverLetter">Cover Letter</Label>
                            <Textarea
                              id="coverLetter"
                              placeholder="Explain why you're the best fit for this project..."
                              rows={6}
                              value={bidForm.coverLetter}
                              onChange={(e) => setBidForm({ ...bidForm, coverLetter: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="rate">Your Rate (₹)</Label>
                              <Input
                                id="rate"
                                type="number"
                                placeholder="5000"
                                value={bidForm.rate}
                                onChange={(e) => setBidForm({ ...bidForm, rate: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="timeline">Timeline</Label>
                              <Select
                                value={bidForm.timeline}
                                onValueChange={(value) => setBidForm({ ...bidForm, timeline: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                                  <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                                  <SelectItem value="1-2 months">1-2 months</SelectItem>
                                  <SelectItem value="2-3 months">2-3 months</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button onClick={handleSubmitBid} className="w-full">
                            Submit Bid
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <p className="text-xs text-center text-muted-foreground mt-3">
                      Free to bid • No obligation
                    </p>
                      {/* Show quick negotiate action after successful bid submission */}
                      {lastSubmittedBidId && (
                        <div className="mt-4 text-center">
                          <div className="text-sm font-medium mb-2">Your bid was submitted</div>
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={() => navigate(`/projects/${id}/bids/${lastSubmittedBidId}`)}>
                              Negotiate
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setLastSubmittedBidId(null)}>
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {isClientOwner && !hasHiredFreelancers && (project as any).status !== 'completed' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-dashed bg-muted/20">
                  <CardContent className="pt-6 text-center space-y-2">
                    <div className="font-semibold text-sm">Workspace Locked</div>
                    <p className="text-xs text-muted-foreground">
                      Workspace opens automatically once you hire one or more freelancers from the bids.
                    </p>
                    <Button className="w-full" variant="outline" disabled>
                      Hire Freelancer to Unlock Workspace
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {workspaceEnabled && (project as any).status !== 'completed' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <Button className="w-full" onClick={() => navigate(`/workspace/${id}`)}>
                      Open Workspace
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Chat, video calls, and file sharing
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Complete Project Button - Only for client owner when a freelancer has been hired */}
            {isClientOwner && hasHiredFreelancers && (project as any).status !== 'completed' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
                      <div>
                        <AlertDialogTrigger asChild>
                          <Button 
                            className="w-full bg-white text-blue-600 border border-gray-200 hover:bg-blue-50"
                          >
                            Complete Project
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Complete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Rate the freelancer and complete the project. Final payment will be processed automatically.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Overall Rating</Label>
                              <div className="flex items-center space-x-1 mt-1">
                                {[1,2,3,4,5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-5 w-5 cursor-pointer ${star <= (completeForm.finalRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    onClick={() => setCompleteForm({ ...completeForm, finalRating: star })}
                                  />
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground">{completeForm.finalRating}/5</span>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Project Review</Label>
                              <Textarea
                                value={completeForm.review}
                                onChange={(e) => setCompleteForm({ ...completeForm, review: e.target.value })}
                                placeholder="Share your experience working on this project..."
                                rows={3}
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Detailed Ratings</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                  <Label className="text-xs">Communication</Label>
                                  <Select value={completeForm.categories.communication.toString()} onValueChange={(value) => setCompleteForm({ ...completeForm, categories: { ...completeForm.categories, communication: parseInt(value) } })}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {[1,2,3,4,5].map(r => <SelectItem key={r} value={r.toString()}>{r}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Quality</Label>
                                  <Select value={completeForm.categories.quality.toString()} onValueChange={(value) => setCompleteForm({ ...completeForm, categories: { ...completeForm.categories, quality: parseInt(value) } })}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {[1,2,3,4,5].map(r => <SelectItem key={r} value={r.toString()}>{r}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Timeliness</Label>
                                  <Select value={completeForm.categories.timeliness.toString()} onValueChange={(value) => setCompleteForm({ ...completeForm, categories: { ...completeForm.categories, timeliness: parseInt(value) } })}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {[1,2,3,4,5].map(r => <SelectItem key={r} value={r.toString()}>{r}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Professionalism</Label>
                                  <Select value={completeForm.categories.professionalism.toString()} onValueChange={(value) => setCompleteForm({ ...completeForm, categories: { ...completeForm.categories, professionalism: parseInt(value) } })}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {[1,2,3,4,5].map(r => <SelectItem key={r} value={r.toString()}>{r}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-2">
                              <AlertDialogCancel asChild>
                                <Button variant="outline">Cancel</Button>
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmComplete} asChild>
                                <Button>Complete Project</Button>
                              </AlertDialogAction>
                            </div>
                          </div>
                        </AlertDialogContent>
                      </div>
                    </AlertDialog>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      End project and process final payment
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Hire Confirmation Dialog */}
        <AlertDialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hire Freelancer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to hire this freelancer? They will be notified and your project status will be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmHire}>
                Confirm Hire
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Freelancer Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Freelancer Profile</DialogTitle>
              <DialogDescription>Public information about the freelancer</DialogDescription>
            </DialogHeader>
            <div className="p-4">
              {selectedFreelancerProfile ? (
                <FreelancerProfile freelancer={selectedFreelancerProfile} />
              ) : (
                <div className="text-center py-8">Loading...</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Details Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>Information about this payment transaction</DialogDescription>
            </DialogHeader>
            <div className="p-4">
              {selectedPayment ? (
                <div>
                  <div className="mt-3">
                    <div className="text-sm">Amount: <strong>₹{selectedPayment.amount}</strong></div>
                    <div className="text-sm">Type: {selectedPayment.paymentType}</div>
                    <div className="text-sm">Method: {selectedPayment.paymentMethod}</div>
                    <div className="text-sm">Status: {selectedPayment.status}</div>
                    <div className="text-sm">For: {selectedPayment.timelineItem?.title || selectedPayment.description}</div>
                    {selectedPayment.paymentDetails && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Transaction: {selectedPayment.paymentDetails.transactionId} • Gateway: {selectedPayment.paymentDetails.gateway}
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="font-medium">Metadata</div>
                      <pre className="text-xs mt-1 bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(selectedPayment.metadata || {}, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                // Show payment list when no specific payment is selected
                paymentsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No payments found for this project.</div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p._id} className="p-3 border rounded flex items-center justify-between">
                        <div>
                          <div className="font-medium">₹{p.amount} • {p.paymentType}</div>
                          <div className="text-xs text-muted-foreground">{p.timelineItem?.title || p.description} • {new Date(p.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedPayment(p); }}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Reviews Dialog */}
        <Dialog open={reviewsDialogOpen} onOpenChange={setReviewsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Project Reviews</DialogTitle>
              <DialogDescription>Client & freelancer reviews for this project</DialogDescription>
            </DialogHeader>
            <div className="p-4">
              <div className="text-lg font-semibold">Project Reviews ({projectRatings.totalRatings})</div>
              <div className="mt-4 space-y-4">
                {projectRatings.ratings && projectRatings.ratings.length > 0 ? projectRatings.ratings.map((r: any) => (
                  <div key={r._id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{r.client?.name}</div>
                      <div className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Rating: {r.rating}/5</div>
                    {r.review && <div className="mt-2">{r.review}</div>}
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">No reviews yet.</div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        
      </div>
    </div>
  );
}
