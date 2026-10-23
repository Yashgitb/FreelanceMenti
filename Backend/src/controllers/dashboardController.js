import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import Payment from '../models/Payment.js';
import Timeline from '../models/Timeline.js';
import User from '../models/User.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let stats = {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
    };

    if (userRole === 'client') {
      // Client-specific stats
      const projects = await Project.find({ client: userId });
      stats.totalProjects = projects.length;
      stats.activeProjects = await Project.countDocuments({ 
        client: userId, 
        status: { $in: ['active', 'in_progress'] } 
      });
      stats.completedProjects = await Project.countDocuments({ 
        client: userId, 
        status: 'completed' 
      });

      // Additional client stats
      const payments = await Payment.find({ client: userId, status: 'completed' });
      stats.totalSpent = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      const avgBudget = projects.length > 0 
        ? projects.reduce((sum, p) => sum + (p.budget?.max || 0), 0) / projects.length 
        : 0;
      stats.averageProjectBudget = Math.round(avgBudget);

      // Count hired freelancers
      const hiredBids = await Bid.find({ status: 'hired' }).populate('project');
      const clientHiredBids = hiredBids.filter(bid => bid.project && bid.project.client.toString() === userId.toString());
      stats.totalHiredFreelancers = clientHiredBids.length;

      // Pending proposals
      const clientProjects = await Project.find({ client: userId, status: { $ne: 'completed' } });
      let pendingCount = 0;
      for (const project of clientProjects) {
        const bidCount = await Bid.countDocuments({ project: project._id, status: 'pending' });
        pendingCount += bidCount;
      }
      stats.pendingProposals = pendingCount;

    } else if (userRole === 'freelancer') {
      // Freelancer-specific stats
      const bids = await Bid.find({ freelancer: userId });
      const hiredBids = bids.filter(bid => bid.status === 'hired');
      
      stats.activeContracts = hiredBids.length;
      stats.totalProjects = bids.length;
      stats.completedProjects = await Project.countDocuments({
        _id: { $in: hiredBids.map(bid => bid.project) },
        status: 'completed'
      });

      // Earnings
      const payments = await Payment.find({ freelancer: userId, status: 'completed' });
      stats.totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      const avgRate = hiredBids.length > 0 
        ? hiredBids.reduce((sum, bid) => sum + (bid.rate || 0), 0) / hiredBids.length 
        : 0;
      stats.averageProjectRate = Math.round(avgRate);

      // Available jobs (projects without bids from this user)
      const userBidProjects = bids.map(bid => bid.project.toString());
      stats.availableJobs = await Project.countDocuments({
        status: 'open',
        _id: { $nin: userBidProjects }
      });

      // Success rate
      const acceptedBids = bids.filter(bid => bid.status === 'hired').length;
      stats.successRate = bids.length > 0 ? Math.round((acceptedBids / bids.length) * 100) : 0;

      // Profile views (mock data for now)
      stats.profileViews = Math.floor(Math.random() * 100) + 50;
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 10;
    
    let activities = [];

    if (userRole === 'client') {
      // Recent project activities for clients
      const recentProjects = await Project.find({ client: userId })
        .sort({ createdAt: -1 })
        .limit(5);

      for (const project of recentProjects) {
        activities.push({
          id: `project_${project._id}`,
          type: 'project_posted',
          title: 'Project Posted',
          description: `Posted "${project.title}"`,
          timestamp: project.createdAt,
          metadata: { projectId: project._id }
        });

        // Recent bids on this project
        const recentBids = await Bid.find({ project: project._id })
          .populate('freelancer', 'name')
          .sort({ createdAt: -1 })
          .limit(2);

        for (const bid of recentBids) {
          activities.push({
            id: `bid_${bid._id}`,
            type: 'bid_received',
            title: 'New Proposal Received',
            description: `${bid.freelancer.name} submitted a proposal for "${project.title}"`,
            timestamp: bid.createdAt,
            metadata: { 
              projectId: project._id, 
              amount: bid.rate,
              freelancerName: bid.freelancer.name
            }
          });
        }
      }

      // Recent payments
      const recentPayments = await Payment.find({ client: userId })
        .populate('freelancer', 'name')
        .populate('project', 'title')
        .sort({ createdAt: -1 })
        .limit(3);

      for (const payment of recentPayments) {
        activities.push({
          id: `payment_${payment._id}`,
          type: 'payment_released',
          title: 'Payment Released',
          description: `Paid ${payment.freelancer.name} for "${payment.project.title}"`,
          timestamp: payment.createdAt,
          metadata: { 
            amount: payment.amount,
            freelancerName: payment.freelancer.name
          }
        });
      }

    } else if (userRole === 'freelancer') {
      // Recent activities for freelancers
      const recentBids = await Bid.find({ freelancer: userId })
        .populate('project', 'title')
        .sort({ createdAt: -1 })
        .limit(5);

      for (const bid of recentBids) {
        if (bid.status === 'hired') {
          activities.push({
            id: `hired_${bid._id}`,
            type: 'hired',
            title: 'Congratulations! You were hired',
            description: `Hired for "${bid.project.title}"`,
            timestamp: bid.updatedAt,
            metadata: { 
              projectId: bid.project._id,
              amount: bid.rate
            }
          });
        }
      }

      // Recent payments received
      const recentPayments = await Payment.find({ freelancer: userId })
        .populate('client', 'name')
        .populate('project', 'title')
        .sort({ createdAt: -1 })
        .limit(5);

      for (const payment of recentPayments) {
        activities.push({
          id: `payment_${payment._id}`,
          type: 'payment_released',
          title: 'Payment Received',
          description: `Received payment from ${payment.client.name}`,
          timestamp: payment.createdAt,
          metadata: { 
            amount: payment.amount,
            clientName: payment.client.name
          }
        });
      }
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    activities = activities.slice(0, limit);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get upcoming tasks
export const getUpcomingTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 10;
    
    let tasks = [];

    if (userRole === 'client') {
      // Upcoming milestones for client projects
      const clientProjects = await Project.find({ 
        client: userId, 
        status: { $in: ['active', 'in_progress'] }
      });

      for (const project of clientProjects) {
        const timelineItems = await Timeline.find({ 
          project: project._id,
          status: { $in: ['pending', 'in_progress'] }
        }).sort({ dueDate: 1 });

        for (const item of timelineItems) {
          tasks.push({
            id: item._id,
            projectId: project._id,
            projectTitle: project.title,
            title: item.title,
            description: item.description || '',
            dueDate: item.dueDate || new Date(),
            status: item.status,
            priority: item.priority || 'medium',
            paymentAmount: item.paymentAmount
          });
        }
      }

    } else if (userRole === 'freelancer') {
      // Tasks for hired freelancer
      const hiredBids = await Bid.find({ freelancer: userId, status: 'hired' })
        .populate('project');

      for (const bid of hiredBids) {
        // Skip if project is null or undefined
        if (!bid.project || !bid.project._id) {
          continue;
        }
        
        const timelineItems = await Timeline.find({ 
          project: bid.project._id,
          status: { $in: ['pending', 'in_progress'] }
        }).sort({ dueDate: 1 });

        for (const item of timelineItems) {
          tasks.push({
            id: item._id,
            projectId: bid.project._id,
            projectTitle: bid.project.title,
            title: item.title,
            description: item.description || '',
            dueDate: item.dueDate || new Date(),
            status: item.status,
            priority: item.priority || 'medium',
            paymentAmount: item.paymentAmount
          });
        }
      }
    }

    // Sort by due date and limit
    tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    tasks = tasks.slice(0, limit);

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment summary
export const getPaymentSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let summary = {};

    if (userRole === 'client') {
      const allPayments = await Payment.find({ client: userId });
      
      summary = {
        totalSpent: allPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0),
        escrowBalance: allPayments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0),
        pendingPayments: allPayments
          .filter(p => p.status === 'processing')
          .reduce((sum, p) => sum + p.amount, 0),
      };
      
    } else if (userRole === 'freelancer') {
      const allPayments = await Payment.find({ freelancer: userId });
      
      summary = {
        totalEarned: allPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0),
        availableBalance: allPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0), // Would be minus withdrawals in real system
        pendingPayouts: allPayments
          .filter(p => p.status === 'processing')
          .reduce((sum, p) => sum + p.amount, 0),
      };
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};