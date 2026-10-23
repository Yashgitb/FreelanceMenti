import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, DollarSign, Users } from 'lucide-react';
import { IndianRupee } from 'lucide-react';
import { Project } from '@/store/slices/projectSlice';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

const urgencyColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  high: 'bg-destructive text-destructive-foreground',
};

export const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  if (!project || !project.id) return null;
  // Helper to safely extract a display string from potentially null/undefined/primitive/object fields
  const safeField = (v: any) => {
    if (v == null) return '';
    if (typeof v === 'object') return v.name ?? JSON.stringify(v);
    return String(v);
  };

  const title = safeField(project.title);
  const description = safeField(project.description);
  const clientName = project.client?.name || 'Unknown Client';
  const skills = Array.isArray(project.skills) ? project.skills.map(s => safeField(s)) : [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full flex"
    >
      {/* Give cards a bit more min-height and padding so content doesn't feel cramped */}
      <Card className="cursor-pointer card-hover h-full flex flex-col justify-between min-h-[360px]" onClick={onClick}>
        <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-2 line-clamp-2">{title}</h3>
              {project.urgency && (
                <Badge className={cn('mb-2', urgencyColors[project.urgency])}>
                  {project.urgency} priority
                </Badge>
              )}
            </div>
            <Avatar className="ml-3">
              <AvatarImage src={project.client?.avatar} alt={clientName} />
              <AvatarFallback>{clientName[0] || '?'}</AvatarFallback>
            </Avatar>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {description}
          </p>

          <div className="flex flex-wrap gap-2 mb-4 max-w-full">
            {skills.slice(0, 3).map((skill, idx) => (
              <Badge key={skill + '-' + idx} variant="secondary">
                {skill}
              </Badge>
            ))}
            {skills.length > 3 && (
              <Badge variant="outline">+{skills.length - 3}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-auto items-center">
            <div className="flex items-center text-muted-foreground w-full">
               { <IndianRupee className='h-4 w-4 mr-1' /> }
              {/* <DollarSign className="h-4 w-4 mr-1" /> */}
              <span>
                {project.budget?.min >= 1000 ? `₹${project.budget?.min/1000}k` : `₹${project.budget?.min}`} -
                {project.budget?.max >= 1000 ? `₹${project.budget?.max/1000}k` : `₹${project.budget?.max}`}
              </span>
            </div>
            <div className="flex items-center text-muted-foreground w-full">
              <Users className="h-4 w-4 mr-1" />
              <span>{project.bids || 0} bids</span>
            </div>
            <div className="flex items-center text-muted-foreground w-full">
              <Clock className="h-4 w-4 mr-1" />
              <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-4">
          <Button className="w-full" variant="outline">
            View Project
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
