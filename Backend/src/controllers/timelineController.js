import Timeline from '../models/Timeline.js';
import Project from '../models/Project.js';
import Bid from '../models/Bid.js';
import Payment from '../models/Payment.js';

// Get timeline items for a project
export const getProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verify user has access to this project
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Allow project client or the hired freelancer to view the timeline
    const isClient = project.client.toString() === req.user._id.toString();
    let isHiredFreelancer = false;
    if (!isClient) {
      const hiredBid = await Bid.findOne({ project: projectId, freelancer: req.user._id, status: 'hired' }).lean();
      isHiredFreelancer = !!hiredBid;
    }

    if (!isClient && !isHiredFreelancer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timeline = await Timeline.find({ project: projectId })
      .populate('createdBy', 'name avatar')
      .populate('assignedTo', 'name avatar')
      .populate('comments.user', 'name avatar')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json(timeline);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new timeline item
export const createTimelineItem = async (req, res) => {
  try {
    const { projectId } = req.params;
    const data = req.body;

    // Verify user has access to this project
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is client or hired freelancer
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

    const timelineItem = await Timeline.create({
      project: projectId,
      title: data.title,
      description: data.description,
      type: data.type || 'task',
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      assignedTo: data.assignedTo,
      createdBy: req.user._id,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      tags: data.tags || [],
      order: data.order || 0
    });

    // If client supplied a paymentAmount, validate and create an escrow/partial payment
    if (isClient && data.paymentAmount && Number(data.paymentAmount) > 0) {
      // Server-side guard: ensure paymentAmount does not push total (completed + pending) beyond hired bid rate or project budget
      try {
        // sum existing payments for this project (completed + pending + processing)
        const existingPayments = await Payment.find({ project: projectId, status: { $in: ['pending', 'processing', 'completed'] } }).lean();
        const existingTotal = existingPayments.reduce((s, p) => s + (p.amount || 0), 0);

        // get hired bid if exists
        const hiredBid = await Bid.findOne({ project: projectId, status: 'hired' }).lean();
        const hiredRate = hiredBid ? Number(hiredBid.rate || 0) : null;
        const budgetMax = project.budget?.max || 0;

        const allowedRemaining = (typeof hiredRate === 'number' && hiredRate > 0)
          ? Math.max(0, hiredRate - existingTotal)
          : Math.max(0, budgetMax - existingTotal);

        if (Number(data.paymentAmount) > allowedRemaining) {
          // cleanup created timeline item since payment failed validation
          await Timeline.findByIdAndDelete(timelineItem._id);
          return res.status(400).json({ message: `Escrow amount exceeds remaining allowed amount (₹${allowedRemaining}).` });
        }
      } catch (err) {
        console.error('Error validating payment cap:', err);
        // don't block flow if validation subsystem fails — fall through to create payment
      }

      // Determine freelancer: prefer assignedTo, else use hiredBid.freelancer
      let freelancerId = data.assignedTo;
      if (!freelancerId) {
        const hiredBid = await Bid.findOne({ project: projectId, status: 'hired' }).lean();
        if (hiredBid) freelancerId = hiredBid.freelancer;
      }

      if (!freelancerId) {
        // Can't escrow payment when no freelancer assigned/hired
        console.warn('Payment amount provided but no freelancer found to escrow to');
      } else {
        const payment = await Payment.create({
          client: req.user._id,
          freelancer: freelancerId,
          project: projectId,
          timelineItem: timelineItem._id,
          amount: Number(data.paymentAmount),
          currency: 'INR',
          status: 'pending',
          paymentType: 'partial_payment',
          paymentMethod: 'escrow',
          description: `Escrow for task: ${data.title}`,
          isPartial: true
        });

        // Attach payment ref to timeline item
        await Timeline.findByIdAndUpdate(timelineItem._id, { paymentAmount: Number(data.paymentAmount), paymentId: payment._id });
      }
    }
    const populatedItem = await Timeline.findById(timelineItem._id)
      .populate('createdBy', 'name avatar')
      .populate('assignedTo', 'name avatar')
      .lean();

    res.status(201).json(populatedItem);
  } catch (error) {
    console.error('Error creating timeline item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Update a timeline item
export const updateTimelineItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const data = req.body;

    const timelineItem = await Timeline.findById(itemId)
      .populate('project', 'client')
      .lean();

    if (!timelineItem) {
      return res.status(404).json({ message: 'Timeline item not found' });
    }

    // Check if user has access to this project
    const project = await Project.findById(timelineItem.project._id).lean();
    const isClient = project.client.toString() === req.user._id.toString();
    let isHiredFreelancer = false;
    
    if (!isClient) {
      const hiredBid = await Bid.findOne({
        project: timelineItem.project._id,
        freelancer: req.user._id,
        status: 'hired'
      }).lean();
      isHiredFreelancer = !!hiredBid;
    }

    if (!isClient && !isHiredFreelancer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow clients to assign tasks to freelancers
    if (data.assignedTo && !isClient) {
      return res.status(403).json({ message: 'Only clients can assign tasks' });
    }

    const updateData = { ...data };
    
    // Set completedAt when status changes to completed
    if (data.status === 'completed' && timelineItem.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const updatedItem = await Timeline.findByIdAndUpdate(
      itemId,
      updateData,
      { new: true }
    )
      .populate('createdBy', 'name avatar')
      .populate('assignedTo', 'name avatar')
      .populate('comments.user', 'name avatar')
      .lean();

    // If this item had an associated pending escrow/partial payment and it just moved to completed, release it
    try {
      if (data.status === 'completed') {
        const itemWithPayment = await Timeline.findById(itemId).lean();
        if (itemWithPayment && itemWithPayment.paymentId && !itemWithPayment.paymentReleased) {
          const payment = await Payment.findById(itemWithPayment.paymentId);
          if (payment && payment.status === 'pending') {
            // Simulate payment processing
            await Payment.findByIdAndUpdate(payment._id, {
              status: 'completed',
              processedAt: new Date(),
              paymentDetails: {
                transactionId: `TXN${Date.now()}`,
                gateway: 'simulated-escrow',
                gatewayTransactionId: `GTX${Date.now()}`
              }
            });

            // Credit freelancer earnings
            const User = (await import('../models/User.js')).default;
            await User.findByIdAndUpdate(payment.freelancer, { $inc: { totalEarnings: payment.amount } });

            // Mark timeline item as paymentReleased
            await Timeline.findByIdAndUpdate(itemId, { paymentReleased: true });
          }
        }
      }
    } catch (err) {
      console.error('Error releasing payment for timeline item:', err);
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating timeline item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a timeline item
export const deleteTimelineItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const timelineItem = await Timeline.findById(itemId)
      .populate('project', 'client')
      .lean();

    if (!timelineItem) {
      return res.status(404).json({ message: 'Timeline item not found' });
    }

    // Check if user is the client (only clients can delete)
    const project = await Project.findById(timelineItem.project._id).lean();
    const isClient = project.client.toString() === req.user._id.toString();

    if (!isClient) {
      return res.status(403).json({ message: 'Only clients can delete timeline items' });
    }

    await Timeline.findByIdAndDelete(itemId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting timeline item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add comment to timeline item
export const addComment = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { content } = req.body;

    const timelineItem = await Timeline.findById(itemId)
      .populate('project', 'client')
      .lean();

    if (!timelineItem) {
      return res.status(404).json({ message: 'Timeline item not found' });
    }

    // Check if user has access to this project
    const project = await Project.findById(timelineItem.project._id).lean();
    const isClient = project.client.toString() === req.user._id.toString();
    let isHiredFreelancer = false;
    
    if (!isClient) {
      const hiredBid = await Bid.findOne({
        project: timelineItem.project._id,
        freelancer: req.user._id,
        status: 'hired'
      }).lean();
      isHiredFreelancer = !!hiredBid;
    }

    if (!isClient && !isHiredFreelancer) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedItem = await Timeline.findByIdAndUpdate(
      itemId,
      {
        $push: {
          comments: {
            user: req.user._id,
            content: content
          }
        }
      },
      { new: true }
    )
      .populate('createdBy', 'name avatar')
      .populate('assignedTo', 'name avatar')
      .populate('comments.user', 'name avatar')
      .lean();

    res.json(updatedItem);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get timeline statistics for a project
export const getTimelineStats = async (req, res) => {
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

    const stats = await Timeline.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$estimatedHours' }
        }
      }
    ]);

    const totalItems = await Timeline.countDocuments({ project: projectId });
    const completedItems = await Timeline.countDocuments({ 
      project: projectId, 
      status: 'completed' 
    });

    const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    res.json({
      totalItems,
      completedItems,
      progressPercentage: Math.round(progressPercentage),
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, hours: stat.totalHours || 0 };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching timeline stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
