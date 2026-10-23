import { useState } from 'react';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className={`${open ? 'w-64' : 'w-0'} transition-all duration-200 overflow-hidden border-r border-border bg-card sticky top-0 h-screen hidden lg:block`}>
        <DashboardSidebar />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:hidden">
          <div className="h-14 flex items-center justify-between px-3 border-b border-border">
            <span className="font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DashboardSidebar />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-40 h-14 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-3">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Toggle sidebar">
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Profile Circle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.role === 'client' ? 'Client' : 'Freelancer'}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="text-xs font-medium">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}


