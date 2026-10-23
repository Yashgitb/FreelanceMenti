import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  title: string;
  value?: React.ReactNode;
  description?: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  className?: string;
};

export const DashboardCard: React.FC<Props> = ({
  title,
  value,
  description,
  icon: Icon,
  onClick,
  className = '',
}) => {
  return (
    <Card
      className={`p-4 hover:bg-muted/50 transition cursor-pointer ${className}`}
      onClick={onClick}
    >
      <CardContent className="flex items-start gap-4 p-3">
        {Icon ? (
          <div className="p-2 rounded-md bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        ) : null}

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            {value !== undefined && (
              <div className="text-lg font-semibold text-foreground">{value}</div>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;
