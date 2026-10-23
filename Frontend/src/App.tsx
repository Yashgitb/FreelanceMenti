import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { store } from './store';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import BidWorkspace from "./pages/BidWorkspace";
import Messages from "./pages/Messages";
import PostProject from "./pages/PostProject";
import Dashboard from "./pages/Dashboard";
import DashboardFreelancer from "./pages/DashboardFreelancer";
import DashboardClient from "./pages/DashboardClient";
import MyProjects from "./pages/MyProjects";
import Workspace from "./pages/Workspace";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import Placeholder from "./pages/_Placeholder";
import ProfileSettings from "./pages/ProfileSettings";
import Chat from "./pages/Chat";
import Payments from "./pages/Payments";
import SidebarLayout from "./components/layout/SidebarLayout";
import KanbanTasks from "./pages/tasks/KanbanTasks";
import CompletedProjects from "./pages/CompletedProjects";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/profile" element={<Placeholder title="Profile" description="User profile, avatar, bio, skills." />} />
            <Route path="/settings/profile" element={<ProtectedRoute><SidebarLayout><ProfileSettings /></SidebarLayout></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><SidebarLayout><Payments /></SidebarLayout></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><SidebarLayout><Chat /></SidebarLayout></ProtectedRoute>} />
            <Route path="/portfolio" element={<Placeholder title="Portfolio" description="Showcase freelancer's work samples." />} />
            <Route path="/help" element={<Placeholder title="Help & Support" description="FAQ and contact support." />} />
            <Route path="/admin" element={<Placeholder title="Admin Dashboard" description="Manage users, projects, reports." />} />
            <Route path="/terms" element={<Placeholder title="Terms of Service" description="Platform terms." />} />
            <Route path="/privacy" element={<Placeholder title="Privacy Policy" description="Data and privacy details." />} />
            <Route path="/users" element={<Placeholder title="User Management" description="Admin view/manage users." />} />
            <Route path="/edit-project/:id" element={<Placeholder title="Edit Project" description="Edit an existing project." />} />
            <Route path="/my-bids" element={<Placeholder title="My Bids" description="Freelancer bid management." />} />
            <Route path="/settings" element={<Placeholder title="Settings" description="General app settings." />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<SidebarLayout><ProjectDetail /></SidebarLayout>} />
            <Route path="/projects/:projectId/bids/:bidId" element={<ProtectedRoute><SidebarLayout><BidWorkspace /></SidebarLayout></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><SidebarLayout><Messages /></SidebarLayout></ProtectedRoute>} />
            <Route path="/how-it-works" element={<Landing />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/freelancer" element={<ProtectedRoute><DashboardFreelancer /></ProtectedRoute>} />
            <Route path="/dashboard/client" element={<ProtectedRoute><DashboardClient /></ProtectedRoute>} />
            <Route path="/post-project" element={<ProtectedRoute><SidebarLayout><PostProject /></SidebarLayout></ProtectedRoute>} />
            <Route path="/my-projects" element={<ProtectedRoute><SidebarLayout><MyProjects /></SidebarLayout></ProtectedRoute>} />
            <Route path="/workspace/:projectId" element={<ProtectedRoute><SidebarLayout><Workspace /></SidebarLayout></ProtectedRoute>} />
            <Route path="/workspace/:projectId/tasks" element={<ProtectedRoute><SidebarLayout><KanbanTasks /></SidebarLayout></ProtectedRoute>} />
            <Route path="/tasks/kanban" element={<ProtectedRoute><SidebarLayout><KanbanTasks /></SidebarLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><SidebarLayout><Notifications /></SidebarLayout></ProtectedRoute>} />
            <Route path="/completed-projects" element={<ProtectedRoute><SidebarLayout><CompletedProjects /></SidebarLayout></ProtectedRoute>} />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
