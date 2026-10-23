import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchCompletedProjects } from '@/store/slices/projectSlice';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, IndianRupee  , DollarSign, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { projectAPI } from '@/lib/api/projects';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SidebarLayout from '@/components/layout/SidebarLayout';

export default function CompletedProjects() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { completedProjects, status, error } = useSelector((state: RootState) => state.project);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [selectedProjectReviews, setSelectedProjectReviews] = useState<any[]>([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string>('');

  useEffect(() => {
    dispatch(fetchCompletedProjects({ page: currentPage, limit: 10 }));
  }, [dispatch, currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Completed Projects</h1>
        <p className="text-muted-foreground">
          View your completed project history and ratings
        </p>
      </div>

      {status === 'loading' ? (
        <div className="animate-pulse">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ) : completedProjects.items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Completed Projects</h3>
          <p className="text-muted-foreground mb-6">
            Your completed projects will appear here once you finish them.
          </p>
          <Button onClick={() => navigate('/projects')}>
            Browse Active Projects
          </Button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedProjects.items.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {project.description}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Completed {formatDate(project.completedAt || project.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={project.client.avatar} />
                          <AvatarFallback className="text-xs">
                            {project.client.name[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{project.client.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-green-600">
                        <IndianRupee className="h-4 w-4" />
                        <span className="font-semibold">
                          {project.totalPaid && project.totalPaid > 0 ? project.totalPaid : (project.hiredBidRate || project.budget?.max || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{project.ratingAvg?.toFixed(1) || '0.0'}</span>
                          <span className="text-xs text-muted-foreground">({project.ratingCount || 0} reviews)</span>
                          <Button size="sm" variant="ghost" className="ml-2" onClick={async () => {
                            try {
                              const resp = await projectAPI.getProjectRatings(project.id);
                              setSelectedProjectReviews(resp.ratings || []);
                              setSelectedProjectTitle(project.title);
                              setReviewsOpen(true);
                            } catch (err) {
                              toast({ title: 'Error', description: 'Failed to load reviews', variant: 'destructive' });
                            }
                          }}>
                            View Reviews
                          </Button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        View Details
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {project.skills?.slice(0, 3).map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {project.skills?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {completedProjects.pagination.pages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {completedProjects.pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, completedProjects.pagination.pages))}
                disabled={currentPage === completedProjects.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Reviews Dialog */}
      <Dialog open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reviews for: {selectedProjectTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedProjectReviews.length === 0 ? (
              <div className="text-center text-muted-foreground">No reviews found for this project.</div>
            ) : (
              selectedProjectReviews.map((r: any) => (
                <div key={r._id} className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={r.client?.avatar} />
                        <AvatarFallback>{r.client?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{r.client?.name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{r.rating}</span>
                    </div>
                  </div>
                  {r.review && <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>}
                  {r.categories && Object.keys(r.categories).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(r.categories).map(([k, v]: any) => (
                        <Badge key={k} variant="outline">{k}: {v}/5</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
