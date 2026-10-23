import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, Eye } from 'lucide-react';

export interface BentoItem {
  id: string;
  title: string;
  image?: string;
  budget?: { min: number; max: number };
  skills?: string[];
  urgency?: 'low' | 'medium' | 'high';
  bids?: number;
  featured?: boolean;
}

interface BentoGridProps {
  items: BentoItem[];
  layoutPreset?: 'balanced' | 'feature-left' | 'feature-top';
  onItemClick?: (item: BentoItem) => void;
  onSave?: (item: BentoItem) => void;
  onQuickView?: (item: BentoItem) => void;
}

// Layout presets define tile sizes in a mosaic pattern
const layoutPresets = {
  balanced: [
    'col-span-2 row-span-2', // featured
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-1 row-span-2',
    'col-span-1 row-span-1',
    'col-span-2 row-span-1',
  ],
  'feature-left': [
    'col-span-2 row-span-3', // big featured left
    'col-span-1 row-span-1',
    'col-span-1 row-span-2',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
  ],
  'feature-top': [
    'col-span-3 row-span-2', // wide featured top
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
    'col-span-1 row-span-1',
  ],
};

const urgencyColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  high: 'bg-destructive text-destructive-foreground',
};

export const BentoGrid = ({
  items,
  layoutPreset = 'balanced',
  onItemClick,
  onSave,
  onQuickView,
}: BentoGridProps) => {
  const layout = layoutPresets[layoutPreset];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[200px]">
      {items.map((item, index) => {
        const tileClass = layout[index % layout.length];
        const isFeatured = index === 0 || item.featured;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'group relative overflow-hidden rounded-xl bg-card border border-border cursor-pointer',
              'bento-tile',
              tileClass
            )}
            onClick={() => onItemClick?.(item)}
          >
            {/* Background image or gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
            
            {/* Content */}
            <div className="relative h-full p-6 flex flex-col justify-between">
              <div>
                {item.urgency && (
                  <Badge className={cn('mb-3', urgencyColors[item.urgency])}>
                    {item.urgency} priority
                  </Badge>
                )}
                
                <h3 className={cn(
                  'font-bold text-foreground line-clamp-2 mb-2',
                  isFeatured ? 'text-2xl' : 'text-lg'
                )}>
                  {item.title}
                </h3>

                {item.budget && (
                  <p className="text-muted-foreground font-semibold mb-3">
                    ₹{item.budget.min.toLocaleString()} - ₹{item.budget.max.toLocaleString()}
                  </p>
                )}

                {item.skills && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.skills.slice(0, isFeatured ? 4 : 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions (shown on hover) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave?.(item);
                  }}
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickView?.(item);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Quick View
                </Button>
              </div>

              {/* Bids indicator */}
              {item.bids !== undefined && (
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="bg-card/80 backdrop-blur-sm">
                    {item.bids} bids
                  </Badge>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
