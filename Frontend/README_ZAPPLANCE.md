# Zapplance - Freelancer Marketplace

A modern, professional freelancer marketplace built with React 18, Redux Toolkit, and a complete design system.

## 🚀 Features

### Public Features
- **Landing Page** - Hero, features, testimonials, how it works
- **Project Discovery** - Bento Grid & List views with filters
- **Project Detail** - Full project information with bidding system
- **Authentication** - Login, Register, and Guest Login

### Protected Features (Authenticated Users)
- **Dashboard** - Overview with stats, recent projects, quick actions
- **Post Project** - Complete form for clients to post projects
- **Submit Bids** - Freelancers can bid on projects
- **Notifications** - Activity feed with unread tracking
- **Guest Mode** - Explore with demo data without registration

### Design System
- **Color Tokens** - Primary Blue (#2563EB), Secondary Amber (#F59E0B)
- **Typography** - Inter font family with clear hierarchy
- **Components** - All styled through design system (no ad-hoc classes)
- **Animations** - Framer Motion for smooth transitions
- **Responsive** - Mobile-first, works across all breakpoints

## 🛠️ Tech Stack

- **React 18** - Functional components with hooks
- **Redux Toolkit** - Global state management
- **React Router v6** - Client-side routing
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **Shadcn UI** - Component library
- **Axios** - API client (with mock layer)

## 📦 Installation

```bash
npm install
npm run dev
```

## 🧪 Development Mode

The app includes a complete mock data layer for development:
- Mock users, projects, bids, and notifications in `src/lib/mock/mockData.ts`
- Mock API functions in `src/lib/api/`
- Guest Login provides instant access to demo data

## 🔐 Guest Login

Click "Continue as Guest" on the login page to explore:
- Full UI with demo data
- Limited actions (no real payments/bids)
- Great for testing and exploration

## 🎨 Bento Grid

The signature Bento Grid layout is available on:
- Project Discovery page (toggle between Bento/List views)
- Portfolio pages (when implemented)
- Team pages (when implemented)

Presets: `balanced`, `feature-left`, `feature-top`

## 🔌 Backend Integration (TODO)

Replace mock APIs in `src/lib/api/` with real endpoints:

### Auth API
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/guest` - Guest session
- `GET /api/auth/me` - Current user

### Projects API
- `GET /api/projects` - List projects with filters
- `GET /api/projects/:id` - Project detail
- `POST /api/projects` - Create project

### Bids API
- `GET /api/projects/:id/bids` - Project bids
- `POST /api/bids` - Submit bid

### Other APIs
- Teams, Tasks, Chat, Payments, Portfolio APIs (stubs included)

## 📱 Pages

### Public
- `/` - Landing page
- `/login` - Login & Guest Login
- `/register` - Registration
- `/projects` - Project discovery (Bento Grid)
- `/projects/:id` - Project detail

### Protected
- `/dashboard` - User dashboard
- `/post-project` - Post new project (clients)
- `/notifications` - Activity notifications

## 🎯 Next Steps

1. **Wire Backend** - Replace mock APIs with real endpoints
2. **Complete Pages** - Kanban, Chat, Video, Teams, Portfolio
3. **Socket.io** - Real-time chat and notifications
4. **WebRTC** - Video call functionality
5. **File Upload** - Avatar, attachments, portfolio images
6. **Search & Filters** - Advanced project filtering
7. **Payment Integration** - Stripe/escrow system

## 📄 License

MIT
