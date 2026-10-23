import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { LayoutDashboard, Briefcase, CheckSquare, CreditCard, MessageSquare, User, FolderPlus, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/store/slices/authSlice';

const freelancerMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Briefcase, label: 'Find Work', path: '/projects' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks/kanban' },
  { icon: CheckSquare, label: 'Completed', path: '/completed-projects' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: User, label: 'Portfolio', path: '/settings/profile' },
];

const clientMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderPlus, label: 'Post Work', path: '/post-project' },
  { icon: Briefcase, label: 'My Projects', path: '/my-projects' },
  { icon: CheckSquare, label: 'Completed', path: '/completed-projects' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
];

export const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const menuItems = user?.role === 'client' ? clientMenuItems : freelancerMenuItems;

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <aside className="flex flex-col w-64 bg-card border-r border-border">
      {/* Top section with logo */}
      <div className="px-4 py-3 border-b border-border flex items-center h-14">
        <img
          src="/ZapLogo.png"
          alt="Zapplance"
          className="h-8 w-auto object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <span className="ml-6 text-lg font-semibold">Zapplance</span>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 p-3 pt-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors w-full mt-4 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};
export default DashboardSidebar;