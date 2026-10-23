
// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// import { AppDispatch, RootState } from '@/store';
// import { fetchProjects } from '@/store/slices/projectSlice';
// import { ProjectCard } from '@/components/ProjectCard';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Search, SlidersHorizontal, AlertCircle } from 'lucide-react';
// import { motion } from 'framer-motion';


// import SidebarLayout from '@/components/layout/SidebarLayout';

// function ProjectsContent() {
//   const [searchQuery, setSearchQuery] = useState('');
//   const dispatch = useDispatch<AppDispatch>();
//   const navigate = useNavigate();
//   const { list: projects, status, error } = useSelector((state: RootState) => state.project);
//   const { user } = useSelector((state: RootState) => state.auth);

//   useEffect(() => {
//     if (status === 'idle') {
//       dispatch(fetchProjects({}));
//     }
//   }, [dispatch, status]);

//   const filteredProjects = searchQuery
//     ? projects.filter(p => {
//         const title = p?.title == null
//           ? ''
//           : typeof p.title === 'object' ? p.title.name || JSON.stringify(p.title) : p.title;
//         const skills = Array.isArray(p.skills)
//           ? p.skills.map(s => s == null ? '' : (typeof s === 'object' ? s.name || JSON.stringify(s) : s))
//           : [];
//         return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//           skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
//       })
//     : projects;

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//             <div>
//               <h1 className="text-3xl font-bold mb-2">Discover Projects</h1>
//               <p className="text-muted-foreground">
//                 Find work that matches your skills from {projects.length}+ opportunities
//               </p>
//             </div>

//             {user?.role === 'client' && (
//               <Button size="lg" onClick={() => navigate('/post-project')}>
//                 Post a Project
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Filters and View Toggle */}
//       <div className="border-b border-border bg-card/30">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
//             {/* Search */}
//             <div className="relative flex-1 max-w-md">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder="Search projects or skills..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="pl-10"
//               />
//             </div>

//             {/* Filters */}
//             <div className="flex items-center gap-3">
//               <Button variant="outline" size="sm">
//                 <SlidersHorizontal className="h-4 w-4 mr-2" />
//                 Filters
//               </Button>
//             </div>
//           </div>

//           {/* Active Filters */}
//           <div className="flex flex-wrap gap-2 mt-4">
//             <Badge variant="secondary">All Projects</Badge>
//           </div>
//         </div>
//       </div>

//       {/* Error Alert */}
//       {error && (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//           <Alert variant="destructive">
//             <AlertCircle className="h-4 w-4" />
//             <AlertDescription>{error}</AlertDescription>
//           </Alert>
//         </div>
//       )}

//       {/* Projects Grid */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {status === 'loading' ? (
//           <div className="text-center py-20">
//             <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
//             <p className="mt-4 text-muted-foreground">Loading projects...</p>
//           </div>
//         ) : (
//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredProjects.map((project, index) => (
//               project && project.id ? (
//                 <motion.div
//                   key={project.id}
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: index * 0.05 }}
//                 >
//                   <ProjectCard
//                     project={project}
//                     onClick={() => navigate(`/projects/${project.id}`)}
//                   />
//                 </motion.div>
//               ) : null
//             ))}
//           </div>
//         )}

//         {filteredProjects.length === 0 && status === 'succeeded' && (
//           <div className="text-center py-20">
//             <div className="mb-6">
//               <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
//                 <Search className="h-12 w-12 text-muted-foreground" />
//               </div>
//               <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
//               <p className="text-muted-foreground mb-6">
//                 {searchQuery 
//                   ? 'No projects match your search criteria.' 
//                   : 'No projects are currently available.'}
//               </p>
//               {searchQuery ? (
//                 <Button variant="outline" onClick={() => setSearchQuery('')}>
//                   Clear Search
//                 </Button>
//               ) : (
//                 <Button variant="outline" onClick={() => dispatch(fetchProjects({}))}>
//                   Refresh
//                 </Button>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default function Projects() {
//   return (
//     <SidebarLayout>
//       <ProjectsContent />
//     </SidebarLayout>
//   );
// }


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchProjects } from '@/store/slices/projectSlice';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import SidebarLayout from '@/components/layout/SidebarLayout';

function ProjectsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { list: projects, status, error } = useSelector((state: RootState) => state.project);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProjects({}));
    }
  }, [dispatch, status]);

  // ***** THIS IS THE FIX *****
  // Because 'projectAPI.ts' now cleans the data,
  // we are guaranteed that 'p.title' is a string and 'p.skills' is a string[].
  // The complex logic is no longer needed and the TypeScript error is gone.
  const filteredProjects = searchQuery
    ? projects.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : projects;
  // ***************************

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Discover Projects</h1>
              <p className="text-muted-foreground">
                Find work that matches your skills from {projects.length}+ opportunities
              </p>
            </div>

            {user?.role === 'client' && (
              <Button size="lg" onClick={() => navigate('/post-project')}>
                Post a Project
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary">All Projects</Badge>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {status === 'loading' ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading projects...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              project && project.id ? (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProjectCard
                    project={project}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  />
                </motion.div>
              ) : null
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && status === 'succeeded' && (
          <div className="text-center py-20">
            <div className="mb-6">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery 
                  ? 'No projects match your search criteria.' 
                  : 'No projects are currently available.'}
              </p>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              ) : (
                <Button variant="outline" onClick={() => dispatch(fetchProjects({}))}>
                  Refresh
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Projects() {
  return (
    <SidebarLayout>
      <ProjectsContent />
    </SidebarLayout>
  );
}