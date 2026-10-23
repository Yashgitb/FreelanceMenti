import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Briefcase, 
  Users, 
  Shield, 
  Zap, 
  TrendingUp,
  CheckCircle,
  Star,
  Lock,
  Video,
  Gavel,
  Target,
  FileText,
  HeadphonesIcon,
  FolderKanban,
  Clock,
  
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

const features = [
  {
    icon: Lock,
    title: 'Secure Escrow Payments',
    description: 'Your funds are protected with bank-grade escrow system. Money is only released when milestones are completed.',
    featured: true,
  },
  {
    icon: Video,
    title: 'Video Calls & Real-time Chat',
    description: 'Built-in video conferencing and instant messaging for seamless communication.',
    featured: true,
  },
  {
    icon: Gavel,
    title: 'Smart Bidding System',
    description: 'Receive competitive bids from qualified freelancers with transparent pricing.',
  },
  {
    icon: Target,
    title: 'Milestone Tracking',
    description: 'Break projects into milestones and track progress with visual dashboards.',
  },
  {
    icon: FileText,
    title: 'Automated Invoicing',
    description: 'Generate professional invoices automatically with every milestone completion.',
  },
  {
    icon: FolderKanban,
    title: 'Portfolio Showcase',
    description: 'Build and display your work portfolio to attract better clients.',
  },
  {
    icon: Clock,
    title: 'Time Tracking',
    description: 'Integrated time tracking tools for hourly projects with detailed reports.',
  },
  {
    icon: Shield,
    title: 'Verified Profiles',
    description: 'Work with confidence knowing all profiles are verified and rated by the community.',
  },
  {
    icon: Zap,
    title: 'Instant Notifications',
    description: 'Stay updated with real-time alerts for bids, messages, and project updates.',
  },
];

const stats = [
  { label: 'Active Projects', value: '10,000+' },
  { label: 'Talented Freelancers', value: '50,000+' },
  { label: 'Happy Clients', value: '25,000+' },
  { label: 'Total Earned', value: '₹100M+' },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Full Stack Developer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    content: 'Zapplance helped me find amazing projects that match my skills. The platform is intuitive and payments are always on time.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'Tech Startup Founder',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    content: 'We found our entire development team through Zapplance. The quality of talent is exceptional and the escrow system gives us peace of mind.',
    rating: 5,
  },
  {
    name: 'Emma Thompson',
    role: 'UX Designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    content: 'The best freelance marketplace I\'ve used. Clean interface, great clients, and the team portfolio feature is perfect for collaborations.',
    rating: 5,
  },
];


const howItWorks = [
  {
    step: 1,
    title: 'Create Your Profile',
    description: 'Sign up and showcase your skills or describe your project needs.',
    icon: Users,
  },
  {
    step: 2,
    title: 'Connect & Match',
    description: 'Browse opportunities or receive bids from qualified freelancers.',
    icon: Search,
  },
  {
    step: 3,
    title: 'Work Together',
    description: 'Collaborate using our built-in tools and milestone tracking.',
    icon: Briefcase,
  },
  {
    step: 4,
    title: 'Get Paid Securely',
    description: 'Release payments through escrow when milestones are completed.',
    icon: CheckCircle,
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Landing Page Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <img 
                src="/ZapLogo.png" 
                alt="Zapplance Logo" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-foreground">Zapplance</span>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
                How it Works
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">
                Testimonials
              </a>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="mb-8">
              <img 
                src="/ZapLogo.png" 
                alt="Zapplance Logo" 
                className="h-16 md:h-20 mx-auto mb-4"
              />
            </div>
            <Badge className="mb-6" variant="secondary">
              Join 50,000+ Freelancers & Clients
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Connecting clients in need,{' '}
              <span className="text-primary">to freelancers who deliver</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Connect with skilled professionals or discover your next opportunity. 
              Build your career on the platform that puts quality first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/register')}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/projects')}>
                Browse Projects
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Zapplance - Beautiful Bento Grid */}
      <section className="relative py-24 overflow-hidden">
        {/* Background gradient decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4" variant="secondary">
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose Zapplance?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to succeed in the freelance marketplace, all in one beautiful platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 auto-rows-fr">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isFeatured = feature.featured;
              
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.4,
                    ease: [0.21, 0.47, 0.32, 0.98]
                  }}
                  className={`group`}
                >
                  <Card className={`relative h-full overflow-hidden border-border/50 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] hover:border-primary/30 ${
                    isFeatured 
                      ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent' 
                      : 'bg-card/80'
                  }`}>
                    {/* Animated gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-secondary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <CardContent className="relative z-10 p-6">
                      <div className="w-12 h-12 mb-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                        <Icon className="h-6 w-6 text-primary transition-colors duration-300 group-hover:text-secondary" />
                      </div>

                      <h3 className="font-bold mb-3 transition-colors duration-300 text-lg">
                        {feature.title}
                      </h3>

                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {feature.description}
                      </p>
                      
                      {/* Decorative corner accent */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started in four simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-border" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Trusted by Thousands</h2>
            <p className="text-xl text-muted-foreground">
              See what our community has to say
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full mr-3"
                      />
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                    <div className="flex mb-3">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of professionals building their future on Zapplance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
                Sign Up Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}