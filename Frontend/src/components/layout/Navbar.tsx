import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { unreadCount } = useSelector((state: RootState) => state.notification);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await dispatch(logout()).unwrap();
    navigate('/');
  };

  const protectedPrefixes = [
    '/dashboard',
    '/workspace',
    '/messages',
    '/payments',
    '/settings',
    '/post-project',
    '/my-projects',
    '/chat',
  ];
  const onProtectedPath = protectedPrefixes.some((p) => location.pathname.startsWith(p));

  if (isAuthenticated || token || onProtectedPath) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/ZapLogo.png" 
                alt="Zapplance Logo" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-foreground">Zapplance</span>
            </Link>
          </div>

          {/* Center (Desktop Navigation) */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            {(!isAuthenticated || user?.role === 'freelancer') && (
              <Link to="/projects" className="text-foreground hover:text-primary transition-colors">
                Find Work
              </Link>
            )}
            {isAuthenticated && user?.role === 'client' && (
              <Link to="/post-project" className="text-foreground hover:text-primary transition-colors">
                Post Work
              </Link>
            )}
            <Link to="/how-it-works" className="text-foreground hover:text-primary transition-colors">
              How it works
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(
                          user?.role === 'client'
                            ? '/dashboard/client'
                            : '/dashboard/freelancer'
                        )
                      }
                    >
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button onClick={() => navigate('/register')}>Get started</Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="px-4 py-3 space-y-3">
            <Link to="/" className="block py-2 text-foreground">
              Home
            </Link>
            {(!isAuthenticated || user?.role === 'freelancer') && (
              <Link to="/projects" className="block py-2 text-foreground">
                Find Work
              </Link>
            )}
            {isAuthenticated && user?.role === 'client' && (
              <Link to="/post-project" className="block py-2 text-foreground">
                Post Work
              </Link>
            )}
            <Link to="/how-it-works" className="block py-2 text-foreground">
              How it works
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="block py-2 text-foreground">
                  Dashboard
                </Link>
                <Button className="w-full" variant="outline" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button className="w-full" variant="outline" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button className="w-full" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;