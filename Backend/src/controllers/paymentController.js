import Payment from '../models/Payment.js';
import Rating from '../models/Rating.js';
import Timeline from '../models/Timeline.js';
import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import { io } from '../server.js';

// Complete a task and create payment
export const completeTask = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rating, review, categories, paymentMethod = 'upi' } = req.body;

    // Get timeline item with project info
    const timelineItem = await Timeline.findById(itemId)
      .populate('project', 'client hiredBid')
      .populate('assignedTo', 'name email')
      .lean();

    if (!timelineItem) {
      return res.status(404).json({ message: 'Timeline item not found' });
    }

    // Verify user is the client
    if (!timelineItem.project) {
      console.error('Timeline item missing project:', timelineItem);
      return res.status(400).json({ message: 'Timeline item missing project reference' });
    }
    const project = await Project.findById(timelineItem.project._id).lean();
    if (!project) {
      console.error('Project not found for timeline item:', timelineItem.project._id);
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!project.hiredBid) {
      console.error('Project missing hiredBid:', project);
      return res.status(400).json({ message: 'Project missing hiredBid' });
    }
    const hiredBid = await Bid.findById(project.hiredBid)
      .populate('freelancer', 'name email')
      .lean();
    if (!hiredBid) {
      console.error('No hired freelancer found for project:', project._id);
      return res.status(400).json({ message: 'No hired freelancer found for this project' });
    }
    if (!hiredBid.rate || isNaN(hiredBid.rate)) {
      console.error('Hired bid missing rate:', hiredBid);
      return res.status(400).json({ message: 'Hired bid missing rate' });
    }

    // Update timeline item status
    await Timeline.findByIdAndUpdate(itemId, {
      status: 'completed',
      completedAt: new Date()
    });

    // Create rating if provided
    let ratingData = null;
    if (rating) {
      // Check for existing rating to avoid duplicate key error
      ratingData = await Rating.findOne({
        project: project._id,
        client: req.user._id,
        freelancer: hiredBid.freelancer._id,
      });
      if (!ratingData) {
        ratingData = await Rating.create({
          project: project._id,
          client: req.user._id,
          freelancer: hiredBid.freelancer._id,
          rating: rating,
          review: review,
          categories: categories,
          timelineItem: itemId,
        });
      } else {
        // Optionally update the existing rating with new info
        ratingData = await Rating.findByIdAndUpdate(ratingData._id, {
          rating: rating,
          review: review,
          categories: categories,
          timelineItem: itemId,
        }, { new: true });
      }
    }

    // Calculate payment amount based on bid logic
    // If task has estimated hours, calculate hourly rate from bid
    // Otherwise, use a percentage of the total bid
    let baseAmount;
    if (timelineItem.estimatedHours) {
      // Calculate hourly rate from total bid (assuming 40 hours per week for project)
      const hourlyRate = hiredBid.rate / 40;
      baseAmount = timelineItem.estimatedHours * hourlyRate;
    } else {
      // Use 15% of total bid for task completion (more realistic than 10%)
      baseAmount = hiredBid.rate * 0.15;
    }

    // Create payment
    const payment = await Payment.create({
      client: req.user._id,
      freelancer: hiredBid.freelancer._id,
      project: project._id,
      timelineItem: itemId,
      amount: Math.round(baseAmount),
      currency: 'INR',
      status: 'pending',
      paymentType: 'task_completion',
      paymentMethod: paymentMethod,
      description: `Payment for completing task: ${timelineItem.title}`,
      metadata: {
        taskTitle: timelineItem.title,
        freelancerName: hiredBid.freelancer.name,
        clientName: req.user.name
      }
    });

    // Send notification to freelancer
    io.to(`user-${hiredBid.freelancer._id}`).emit('payment-notification', {
      type: 'task_completion',
      message: `Payment of ₹${Math.round(baseAmount)} is being processed for task: ${timelineItem.title}`,
      paymentId: payment._id,
      projectId: project._id
    });

    // Simulate payment processing
    setTimeout(async () => {
      try {
        await Payment.findByIdAndUpdate(payment._id, {
          status: 'completed',
          processedAt: new Date(),
          paymentDetails: {
            transactionId: `TXN${Date.now()}`,
            gateway: 'simulated',
            gatewayTransactionId: `GTX${Date.now()}`
          }
        });

        // Update freelancer's earnings
        await User.findByIdAndUpdate(hiredBid.freelancer._id, {
          $inc: { totalEarnings: Math.round(baseAmount) }
        });

        // Send completion notification
        io.to(`user-${hiredBid.freelancer._id}`).emit('payment-notification', {
          type: 'payment_completed',
          message: `Payment of ₹${Math.round(baseAmount)} has been completed!`,
          paymentId: payment._id,
          projectId: project._id
        });
      } catch (error) {
        console.error('Payment processing error:', error);
      }
    }, 2000); // Simulate 2-second processing

    res.json({
      success: true,
      payment: payment,
      rating: ratingData,
      message: 'Task completed successfully. Payment is being processed.'
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create partial payment for a task
export const createPartialPayment = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { amount, percentage, paymentMethod = 'upi' } = req.body;

    // Get timeline item with project info
    const timelineItem = await Timeline.findById(itemId)
      .populate('project', 'client hiredBid')
      .populate('assignedTo', 'name email')
      .lean();

    if (!timelineItem) {
      return res.status(404).json({ message: 'Timeline item not found' });
    }

    // Verify user is the client
    const project = await Project.findById(timelineItem.project._id).lean();
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only clients can create partial payments' });
    }

    // Get hired freelancer
    const hiredBid = await Bid.findById(project.hiredBid)
      .populate('freelancer', 'name email')
      .lean();

    if (!hiredBid) {
      return res.status(400).json({ message: 'No hired freelancer found for this project' });
    }

    // Calculate payment amount based on bid logic
    let baseAmount;
    if (timelineItem.estimatedHours) {
      // Calculate hourly rate from total bid (assuming 40 hours per week for project)
      const hourlyRate = hiredBid.rate / 40;
      baseAmount = timelineItem.estimatedHours * hourlyRate;
    } else {
      // Use 15% of total bid for task completion
      baseAmount = hiredBid.rate * 0.15;
    }

    let paymentAmount = amount;
    if (percentage && !amount) {
      paymentAmount = Math.round((baseAmount * percentage) / 100);
    } else if (!amount) {
      // Default to 25% of base amount if no amount specified
      paymentAmount = Math.round(baseAmount * 0.25);
    }

    // Create partial payment
    const payment = await Payment.create({
      client: req.user._id,
      freelancer: hiredBid.freelancer._id,
      project: project._id,
      timelineItem: itemId,
      amount: paymentAmount,
      currency: 'INR',
      status: 'pending',
      paymentType: 'partial_payment',
      paymentMethod: paymentMethod,
      isPartial: true,
      partialPercentage: percentage,
      description: `Partial payment for task: ${timelineItem.title}`,
      metadata: {
        taskTitle: timelineItem.title,
        freelancerName: hiredBid.freelancer.name,
        clientName: req.user.name
      }
    });

    // Send notification to freelancer
    io.to(`user-${hiredBid.freelancer._id}`).emit('payment-notification', {
      type: 'partial_payment',
      message: `Partial payment of ₹${paymentAmount} is being processed for task: ${timelineItem.title}`,
      paymentId: payment._id,
      projectId: project._id
    });

    // Simulate payment processing
    setTimeout(async () => {
      try {
        await Payment.findByIdAndUpdate(payment._id, {
          status: 'completed',
          processedAt: new Date(),
          paymentDetails: {
            transactionId: `TXN${Date.now()}`,
            gateway: 'simulated',
            gatewayTransactionId: `GTX${Date.now()}`
          }
        });

        // Update freelancer's earnings
        await User.findByIdAndUpdate(hiredBid.freelancer._id, {
          $inc: { totalEarnings: paymentAmount }
        });

        // Send completion notification
        io.to(`user-${hiredBid.freelancer._id}`).emit('payment-notification', {
          type: 'payment_completed',
          message: `Partial payment of ₹${paymentAmount} has been completed!`,
          paymentId: payment._id,
          projectId: project._id
        });
      } catch (error) {
        console.error('Payment processing error:', error);
      }
    }, 2000);

    res.json({
      success: true,
      payment: payment,
      message: 'Partial payment created successfully. Payment is being processed.'
    });
  } catch (error) {
    console.error('Error creating partial payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get payments for a project
export const getProjectPayments = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify user has access to this project
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isClient = project.client.toString() === req.user._id.toString();
    let isHiredFreelancer = false;
    
    if (!isClient) {
      const hiredBid = await Bid.findOne({
        project: projectId,
        freelancer: req.user._id,
        status: 'hired'
      }).lean();
      isHiredFreelancer = !!hiredBid;
    }

    if (!isClient && !isHiredFreelancer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payments = await Payment.find({ project: projectId })
      .populate('client', 'name avatar')
      .populate('freelancer', 'name avatar')
      .populate('timelineItem', 'title type')
      .sort({ createdAt: -1 })
      .lean();

    res.json(payments);
  } catch (error) {
    console.error('Error fetching project payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get ratings for a freelancer
export const getFreelancerRatings = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const ratings = await Rating.find({ freelancer: freelancerId })
      .populate('client', 'name avatar')
      .populate('project', 'title')
      .populate('timelineItem', 'title')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate average rating
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;

    res.json({
      ratings,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length
    });
  } catch (error) {
    console.error('Error fetching freelancer ratings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get ratings for a project
export const getProjectRatings = async (req, res) => {
  try {
    const { projectId } = req.params;

    const ratings = await Rating.find({ project: projectId })
      .populate('client', 'name avatar')
      .populate('freelancer', 'name avatar')
      .populate('timelineItem', 'title')
      .sort({ createdAt: -1 })
      .lean();

    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
      : 0;

    res.json({ ratings, averageRating: avgRating, totalRatings: ratings.length });
  } catch (error) {
    console.error('Error fetching project ratings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Build base filter depending on whether projectId is provided
    let baseFilter = {};
    if (projectId) {
      baseFilter.project = projectId;
    } else {
      // If not project-scoped, scope to the authenticated user based on role
      if (req.user.role === 'client') {
        baseFilter.client = req.user._id;
      } else if (req.user.role === 'freelancer') {
        baseFilter.freelancer = req.user._id;
      }
    }

    // Status breakdown (count and sum by status)
    const statsAgg = await Payment.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalPayments = await Payment.countDocuments(baseFilter);
    const completedPayments = await Payment.countDocuments({
      ...baseFilter,
      status: 'completed'
    });

    const totalEarningsAgg = await Payment.aggregate([
      { $match: { ...baseFilter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalEarnings = totalEarningsAgg[0]?.total || 0;

    // This month's earnings (use createdAt for when payment was created)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthlyAgg = await Payment.aggregate([
      { $match: { 
        ...baseFilter, 
        status: 'completed',
        createdAt: { $gte: startOfMonth, $lt: startOfNextMonth }
      } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const monthlyEarnings = monthlyAgg[0]?.total || 0;

    // Pending amount (pending or processing)
    const pendingAgg = await Payment.aggregate([
      { $match: { ...baseFilter, status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingAmount = pendingAgg[0]?.total || 0;

    // Calculate expected remaining amounts for active (incomplete) timeline items
    let expectedRemaining = 0;
    const remainingBreakdown = [];

    try {
      let timelineFilter = { status: { $ne: 'completed' } };
      if (projectId) {
        timelineFilter.project = projectId;
      } else {
        if (req.user.role === 'client') {
          // find projects owned by client
          const clientProjects = await Project.find({ client: req.user._id }).select('_id hiredBid').lean();
          const projectIds = clientProjects.map(p => p._id);
          if (projectIds.length === 0) {
            timelineFilter.project = null; // no items
          } else {
            timelineFilter.project = { $in: projectIds };
          }
        } else if (req.user.role === 'freelancer') {
          timelineFilter.assignedTo = req.user._id;
        }
      }

      // Fetch timeline items in scope
      const timelineItems = await Timeline.find(timelineFilter)
        .populate({ path: 'project', select: 'hiredBid title client' })
        .lean();

      if (timelineItems.length > 0) {
        const timelineIds = timelineItems.map(t => t._id);

        // Fetch hired bids for involved projects to read rate
        const hiredBidIds = Array.from(new Set(timelineItems.map(t => t.project?.hiredBid).filter(Boolean)));
        const hiredBids = await Bid.find({ _id: { $in: hiredBidIds } }).lean();
        const bidMap = hiredBids.reduce((m, b) => { m[b._id.toString()] = b; return m; }, {});

        // Sum payments already created per timeline item
        const paymentsForItems = await Payment.find({ timelineItem: { $in: timelineIds } }).lean();
        const paidMap = {};
        for (const p of paymentsForItems) {
          const id = p.timelineItem?.toString();
          if (!id) continue;
          paidMap[id] = (paidMap[id] || 0) + (p.amount || 0);
        }

        // Compute expected amount per timeline item using same logic as completeTask/createPartialPayment
        for (const t of timelineItems) {
          const hiredBidId = t.project?.hiredBid;
          const bid = hiredBidId ? bidMap[hiredBidId.toString()] : null;
          if (!bid || !bid.rate) continue; // can't estimate without bid rate

          let baseAmount = 0;
          if (t.estimatedHours) {
            const hourlyRate = bid.rate / 40;
            baseAmount = t.estimatedHours * hourlyRate;
          } else {
            baseAmount = bid.rate * 0.15; // same default percent used elsewhere
          }

          const expected = Math.round(baseAmount);
          const paid = paidMap[t._id.toString()] || 0;
          const remaining = Math.max(expected - paid, 0);
          if (remaining > 0) {
            expectedRemaining += remaining;
            remainingBreakdown.push({
              timelineItemId: t._id,
              title: t.title,
              expected,
              paid,
              remaining
            });
          }
        }
      }
    } catch (err) {
      console.error('Error computing expected remaining:', err);
    }

    // Calculate overall/project remaining (total project amount - sent amount)
    let projectRemaining = 0;
    try {
      if (projectId) {
        const project = await Project.findById(projectId).lean();
        if (project && project.hiredBid) {
          const bid = await Bid.findById(project.hiredBid).lean();
          if (bid && bid.rate) {
            const paidAgg = await Payment.aggregate([
              { $match: { project: projectId } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const paid = paidAgg[0]?.total || 0;
            projectRemaining = Math.max(bid.rate - paid, 0);
          }
        }
      } else {
        if (req.user.role === 'client') {
          const clientProjects = await Project.find({ client: req.user._id, hiredBid: { $exists: true, $ne: null } }).select('_id hiredBid').lean();
          for (const p of clientProjects) {
            const bid = await Bid.findById(p.hiredBid).lean();
            if (!bid || !bid.rate) continue;
            const paidAgg = await Payment.aggregate([
              { $match: { project: p._id } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const paid = paidAgg[0]?.total || 0;
            projectRemaining += Math.max(bid.rate - paid, 0);
          }
        } else if (req.user.role === 'freelancer') {
          const hiredBids = await Bid.find({ freelancer: req.user._id, status: 'hired' }).select('project rate').lean();
          for (const hb of hiredBids) {
            if (!hb || !hb.rate) continue;
            const paidAgg = await Payment.aggregate([
              { $match: { project: hb.project } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const paid = paidAgg[0]?.total || 0;
            projectRemaining += Math.max(hb.rate - paid, 0);
          }
        }
      }
    } catch (err) {
      console.error('Error computing project remaining:', err);
    }

    res.json({
      totalPayments,
      completedPayments,
      totalEarnings,
      monthlyEarnings,
      // pendingAmount remains (sum of payments currently pending/processing)
      pendingAmount,
      // expectedRemaining: task-level remaining
      expectedRemaining,
      remainingBreakdown,
      // projectRemaining: overall remaining from hired bid(s)
      projectRemaining,
      statusBreakdown: statsAgg.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, amount: stat.totalAmount };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Simulate payment processing (for testing)
export const simulatePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status = 'completed' } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    await Payment.findByIdAndUpdate(paymentId, {
      status: status,
      processedAt: new Date(),
      paymentDetails: {
        transactionId: `TXN${Date.now()}`,
        gateway: 'simulated',
        gatewayTransactionId: `GTX${Date.now()}`
      }
    });

    // Update freelancer earnings if completed
    if (status === 'completed') {
      await User.findByIdAndUpdate(payment.freelancer, {
        $inc: { totalEarnings: payment.amount }
      });
    }

    res.json({ success: true, message: `Payment ${status} successfully` });
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Existing payment functions (for compatibility)
export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    // Filter by user role
    if (req.user.role === 'client') {
      filter.client = req.user._id;
    } else if (req.user.role === 'freelancer') {
      filter.freelancer = req.user._id;
    }

    const payments = await Payment.find(filter)
      .populate('client', 'name avatar')
      .populate('freelancer', 'name avatar')
      .populate('project', 'title')
      .populate('timelineItem', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Payment.countDocuments(filter);

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('client', 'name avatar')
      .populate('freelancer', 'name avatar')
      .populate('project', 'title')
      .populate('timelineItem', 'title')
      .lean();

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check access
    if (payment.client._id.toString() !== req.user._id.toString() && 
        payment.freelancer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { projectId, freelancerId, amount, description, paymentMethod = 'upi' } = req.body;

    // Verify user is client
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create payments' });
    }

    const payment = await Payment.create({
      client: req.user._id,
      freelancer: freelancerId,
      project: projectId,
      amount: amount,
      currency: 'INR',
      status: 'pending',
      paymentMethod: paymentMethod,
      description: description
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check access
    if (payment.client.toString() !== req.user._id.toString() && 
        payment.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Payment.findByIdAndUpdate(paymentId, {
      status: status,
      processedAt: status === 'completed' ? new Date() : undefined
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};