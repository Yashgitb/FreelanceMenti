import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Briefcase, AtSign, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Rating {
  rating: number;
  review: string;
  categories: { [key: string]: number };
  createdAt: string;
  client: {
    name: string;
    avatar?: string;
  };
}

interface FreelancerProfile {
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
  recentRatings?: Rating[];
}

export function FreelancerProfile({ freelancer }: { freelancer: FreelancerProfile }) {
  return (
    <div className="space-y-6">
      {/* Basic Info Card */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={freelancer.avatar} alt={freelancer.name} />
              <AvatarFallback>{freelancer.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{freelancer.name}</h3>
              {freelancer.profile.location && (
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>
                    {[
                      freelancer.profile.location.city,
                      freelancer.profile.location.country
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          {freelancer.profile.bio && (
            <p className="text-muted-foreground">{freelancer.profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {freelancer.profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Portfolio Card */}
      {freelancer.profile.portfolio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {freelancer.profile.portfolio.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 border p-4 rounded-lg">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="w-full md:w-48 h-32 object-cover rounded-md" />
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-semibold">{item.title}</h4>
                  <p className="mt-1 text-muted-foreground">{item.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.technologies.map((tech) => (
                      <Badge key={tech} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  {item.projectUrl && (
                    <a
                      href={item.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-sm text-primary hover:underline"
                    >
                      View Project <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reviews Card */}
      {freelancer.recentRatings && freelancer.recentRatings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {freelancer.recentRatings.map((rating, index) => (
              <div key={index} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src={rating.client.avatar} alt={rating.client.name} />
                      <AvatarFallback>{rating.client.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{rating.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < rating.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground">{rating.review}</p>
                {Object.entries(rating.categories).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(rating.categories).map(([category, score]) => (
                      <Badge key={category} variant="outline">
                        {category}: {score}/5
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}