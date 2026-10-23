// import Project from '../models/Project.js';
// import Bid from '../models/Bid.js';

// // Only named exports, no default export
// export const list = async (req, res) => {
//   const { search, skills, minBudget, maxBudget, category, location, deadline } = req.query;
//   const filter = { status: { $ne: 'completed' } }; // Exclude completed projects
//   if (search) filter.$text = { $search: String(search) };
//   if (skills) filter.skills = { $in: String(skills).split(',') };
//   if (minBudget || maxBudget) filter['budget.min'] = { $gte: Number(minBudget || 0) };
//   if (category) filter.category = category;
//   if (location) filter.location = location;
//   if (deadline) filter.deadline = { $lte: new Date(deadline) };

//   // If user is a freelancer, exclude projects where they are hired or rejected
//   if (req.user && req.user.role === 'freelancer') {
//     const userBids = await Bid.find({ 
//       freelancer: req.user._id, 
//       status: { $in: ['hired', 'rejected'] } 
//     }).select('project').lean();
    
//     const excludedProjectIds = userBids.map(bid => bid.project);
//     if (excludedProjectIds.length > 0) {
//       filter._id = { $nin: excludedProjectIds };
//     }
//   }

//   const projects = await Project.find(filter)
//     .populate('client', 'name avatar bio role email')
//     .sort({ createdAt: -1 })
//     .limit(100)
//     .lean();
  
//   // Add bids count to each project
//   const projectsWithBids = await Promise.all(
//     projects.map(async (project) => {
//       const bidsCount = await Bid.countDocuments({ project: project._id });
//       return { ...project, bids: bidsCount };
//     })
//   );
  
//   res.json(projectsWithBids);
// };

// export const listMine = async (req, res) => {
//   // List projects for the current client (used by /me/projects)
//   try {
//     const projects = await Project.find({ 
//       client: req.user._id,
//       status: { $ne: 'completed' } // Exclude completed projects
//     })
//       .populate('client', 'name avatar bio role email')
//       .sort({ createdAt: -1 })
//       .lean();
//     // Add bids count to each project
//     const projectsWithBids = await Promise.all(
//       projects.map(async (project) => {
//         const bidsCount = await Bid.countDocuments({ project: project._id });
//         return { ...project, bids: bidsCount };
//       })
//     );
//     res.json(projectsWithBids);
//   } catch (e) {
//     res.status(500).json({ message: 'Failed to fetch your projects' });
//   }
// };

// export const detail = async (req, res) => {
//   try {
//     const project = await Project.findById(req.params.id)
//       .populate('client', 'name avatar bio role email')
//       .lean();
    
//     // Calculate client statistics
//     if (project && project.client) {
//       const totalProjects = await Project.countDocuments({ client: project.client._id });
//       const totalBids = await Bid.countDocuments({ 
//         project: { $in: await Project.find({ client: project.client._id }).distinct('_id') }
//       });
//       const totalHires = await Bid.countDocuments({ 
//         project: { $in: await Project.find({ client: project.client._id }).distinct('_id') },
//         status: 'hired'
//       });
      
//       project.client.totalProjects = totalProjects;
//       project.client.hireRate = totalBids > 0 ? Math.round((totalHires / totalBids) * 100) : 0;
//     if (!project) return res.status(404).json({ message: 'Not found' });
//     const bidsCount = await Bid.countDocuments({ project: project._id });
//     res.json({ ...project, bids: bidsCount });
//   } catch (error) {
//     // If the ID is not a valid ObjectId, Mongoose will throw a CastError
//     if (error.name === 'CastError') {
//       return res.status(400).json({ message: 'Invalid project ID format' });
//     }
//     // For other potential errors
//     res.status(500).json({ message: 'Error fetching project details' });
//   }
// };

// export const create = async (req, res) => {
//   const body = req.body;
//   const project = await Project.create({
//     title: body.title,
//     description: body.description,
//     skills: body.skills || [],
//     milestones: body.milestones || [],
//     budget: body.budget || {},
//     client: req.user._id,
//     category: body.category,
//     location: body.location,
//     deadline: body.deadline,
//     urgency: body.urgency || 'medium',
//   });
//   res.status(201).json(project);
// };

// export const update = async (req, res) => {
//   try {
//     // Only allow updating specific fields
//     const allowedUpdates = {
//       title: req.body.title,
//       description: req.body.description,
//       skills: req.body.skills,
//       budget: req.body.budget,
//       category: req.body.category,
//       location: req.body.location,
//       deadline: req.body.deadline,
//       urgency: req.body.urgency
//     };

//     // Remove undefined values
//     Object.keys(allowedUpdates).forEach(key => 
//       allowedUpdates[key] === undefined && delete allowedUpdates[key]
//     );

//     // Only allow updates if project is in 'open' status and no one is hired yet
//     const project = await Project.findOneAndUpdate(
//       { 
//         _id: req.params.id, 
//         client: req.user._id,
//         status: 'open',
//         $or: [ { hiredBid: { $exists: false } }, { hiredBid: null } ]
//       },
//       allowedUpdates,
//       { new: true, runValidators: true }
//     );

//     if (!project) {
//       return res.status(404).json({ 
//         message: 'Project not found or cannot be updated in its current state' 
//       });
//     }

//     res.json(project);
//   } catch (error) {
//     res.status(400).json({ 
//       message: 'Error updating project', 
//       error: error.message 
//     });
//   }
// };

// export const remove = async (req, res) => {
//   const project = await Project.findOneAndDelete({ _id: req.params.id, client: req.user._id });
//   if (!project) return res.status(404).json({ message: 'Not found' });
//   res.json({ success: true });
// };

// // Complete a project
// export const completeProject = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const { finalRating, review, categories } = req.body;

//     // Verify user is the client
//     if (req.user.role !== 'client') {
//       return res.status(403).json({ message: 'Only clients can complete projects' });
//     }

//     const project = await Project.findById(projectId).lean();
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }

//     // Verify user owns the project
//     if (project.client.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }

//     // Get hired freelancer
//     const hiredBid = await Bid.findById(project.hiredBid)
//       .populate('freelancer', 'name email')
//       .lean();

//     if (!hiredBid) {
//       return res.status(400).json({ message: 'No hired freelancer found for this project' });
//     }

//     // Update project status
//     await Project.findByIdAndUpdate(projectId, {
//       status: 'completed',
//       completedAt: new Date()
//     });

//     // Create final rating if provided
//     let ratingData = null;
//     if (finalRating) {
//       const Rating = (await import('../models/Rating.js')).default;
//       // Check for existing rating to avoid duplicate key error
//       ratingData = await Rating.findOne({
//         project: projectId,
//         client: req.user._id,
//         freelancer: hiredBid.freelancer._id,
//       });
//       if (!ratingData) {
//         ratingData = await Rating.create({
//           project: projectId,
//           client: req.user._id,
//           freelancer: hiredBid.freelancer._id,
//           rating: finalRating,
//           review: review,
//           categories: categories
//         });
//       } else {
//         // Optionally update the existing rating with new info
//         ratingData = await Rating.findByIdAndUpdate(ratingData._id, {
//           rating: finalRating,
//           review: review,
//           categories: categories
//         }, { new: true });
//       }
//     }

//     // Create final payment (remaining amount from bid)
//     const Payment = (await import('../models/Payment.js')).default;
//     const existingPayments = await Payment.find({ 
//       project: projectId, 
//       status: 'completed' 
//     }).lean();
    
//     const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
//     const remainingAmount = Math.max(0, hiredBid.rate - totalPaid);

//     if (remainingAmount > 0) {
//       const finalPayment = await Payment.create({
//         client: req.user._id,
//         freelancer: hiredBid.freelancer._id,
//         project: projectId,
//         amount: remainingAmount,
//         currency: 'INR',
//         status: 'pending',
//         paymentType: 'final_payment',
//         paymentMethod: 'upi',
//         description: `Final payment for project completion: ${project.title}`,
//         metadata: {
//           projectTitle: project.title,
//           freelancerName: hiredBid.freelancer.name,
//           clientName: req.user.name,
//           totalBidAmount: hiredBid.rate,
//           totalPaidAmount: totalPaid
//         }
//       });

//       // Simulate final payment processing
//       setTimeout(async () => {
//         try {
//           await Payment.findByIdAndUpdate(finalPayment._id, {
//             status: 'completed',
//             processedAt: new Date(),
//             paymentDetails: {
//               transactionId: `TXN${Date.now()}`,
//               gateway: 'simulated',
//               gatewayTransactionId: `GTX${Date.now()}`
//             }
//           });

//           // Update freelancer's earnings
//           const User = (await import('../models/User.js')).default;
//           await User.findByIdAndUpdate(hiredBid.freelancer._id, {
//             $inc: { totalEarnings: remainingAmount }
//           });
//         } catch (error) {
//           console.error('Final payment processing error:', error);
//         }
//       }, 2000);
//     }

//     res.json({
//       success: true,
//       message: 'Project completed successfully',
//       finalPayment: remainingAmount > 0 ? { amount: remainingAmount } : null,
//       rating: ratingData
//     });
//   } catch (error) {
//     console.error('Error completing project:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

// // Get completed projects for history
// export const getCompletedProjects = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;
    
//     const filter = { status: 'completed' };
    
//     // Filter by user role
//     if (req.user.role === 'client') {
//       filter.client = req.user._id;
//     } else if (req.user.role === 'freelancer') {
//       // Find projects where freelancer was hired
//       const hiredBids = await Bid.find({ 
//         freelancer: req.user._id, 
//         status: 'hired' 
//       }).select('project').lean();
      
//       const projectIds = hiredBids.map(bid => bid.project);
//       filter._id = { $in: projectIds };
//     }

//     const projects = await Project.find(filter)
//       .populate('client', 'name avatar bio role email')
//       .populate('hiredBid', 'rate timeline')
//       .sort({ completedAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .lean();

//     const total = await Project.countDocuments(filter);

//     res.json({
//       projects,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         pages: Math.ceil(total / limit),
//         total
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching completed projects:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };



import Project from '../models/Project.js';
import Bid from '../models/Bid.js';

// Only named exports, no default export
export const list = async (req, res) => {
  const { search, skills, minBudget, maxBudget, category, location, deadline } = req.query;
  const filter = { status: { $ne: 'completed' } }; // Exclude completed projects
  if (search) filter.$text = { $search: String(search) };
  if (skills) filter.skills = { $in: String(skills).split(',') };
  if (minBudget || maxBudget) filter['budget.min'] = { $gte: Number(minBudget || 0) };
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (deadline) filter.deadline = { $lte: new Date(deadline) };

  // If user is a freelancer, exclude projects where they are hired or rejected
  if (req.user && req.user.role === 'freelancer') {
    const userBids = await Bid.find({ 
      freelancer: req.user._id, 
      status: { $in: ['hired', 'rejected'] } 
    }).select('project').lean();
    
    const excludedProjectIds = userBids.map(bid => bid.project);
    if (excludedProjectIds.length > 0) {
      filter._id = { $nin: excludedProjectIds };
    }
  }

  const projects = await Project.find(filter)
    .populate('client', 'name avatar bio role email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  
  // Add bids count to each project
  const projectsWithBids = await Promise.all(
    projects.map(async (project) => {
      const bidsCount = await Bid.countDocuments({ project: project._id });
      return { ...project, bids: bidsCount };
    })
  );
  
  res.json(projectsWithBids);
};

export const listMine = async (req, res) => {
  // List projects for the current client (used by /me/projects)
  try {
    const projects = await Project.find({ 
      client: req.user._id,
      status: { $ne: 'completed' } // Exclude completed projects
    })
      .populate('client', 'name avatar bio role email')
      .sort({ createdAt: -1 })
      .lean();
    // Add bids count to each project
    const projectsWithBids = await Promise.all(
      projects.map(async (project) => {
        const bidsCount = await Bid.countDocuments({ project: project._id });
        return { ...project, bids: bidsCount };
      })
    );
    res.json(projectsWithBids);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch your projects' });
  }
};

//
// THIS FUNCTION IS NOW FIXED
//
export const detail = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name avatar bio role email')
      .lean();
    
    // FIX 1: Check for the project *first*
    if (!project) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    // Calculate client statistics (refactored for clarity & efficiency)
    if (project.client) {
      // 1. Get all project IDs for this client
      const clientProjectIds = await Project.find({ client: project.client._id }).distinct('_id');

      // 2. totalProjects is the length of that array
      const totalProjects = Array.isArray(clientProjectIds) ? clientProjectIds.length : 0;

      // 3. Count all bids where project is in clientProjectIds
      const totalBids = clientProjectIds.length > 0
        ? await Bid.countDocuments({ project: { $in: clientProjectIds } })
        : 0;

      // 4. Count all hired bids where project is in clientProjectIds
      const totalHires = clientProjectIds.length > 0
        ? await Bid.countDocuments({ project: { $in: clientProjectIds }, status: 'hired' })
        : 0;

      // 5. Calculate hireRate (handle division by zero)
      const hireRate = totalBids > 0 ? Math.round((totalHires / totalBids) * 100) : 0;

      // 6. Attach stats to project.client
      project.client.totalProjects = totalProjects;
      project.client.hireRate = hireRate;
    }

    // This code now correctly runs *after* the if block
    const bidsCount = await Bid.countDocuments({ project: project._id });

    // Enrich project detail with payment totals and remaining amount for frontend validation/UI
    try {
      const Payment = (await import('../models/Payment.js')).default;
      const payments = await Payment.find({ project: project._id, status: 'completed' }).lean();
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const hiredBid = project.hiredBid ? await Bid.findById(project.hiredBid).lean() : null;
      const hiredBidRate = hiredBid ? Number(hiredBid.rate || 0) : null;

      const remainingAmount = (typeof hiredBidRate === 'number' && hiredBidRate > 0)
        ? Math.max(0, hiredBidRate - totalPaid)
        : Math.max(0, (project.budget?.max || 0) - totalPaid);

      res.json({ ...project, bids: bidsCount, totalPaid, hiredBidRate, remainingAmount });
    } catch (err) {
      console.error('Error enriching project detail with payments:', err);
      // Fallback to basic response
      res.json({ ...project, bids: bidsCount });
    }

  } catch (error) { // <-- The catch block is now valid
    // If the ID is not a valid ObjectId, Mongoose will throw a CastError
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid project ID format' });
    }
    // For other potential errors
    res.status(500).json({ message: 'Error fetching project details' });
  }
};

export const create = async (req, res) => {
  const body = req.body;
  // Validate budget: min should not be greater than max
  const budget = body.budget || {};
  if (typeof budget.min !== 'undefined' && typeof budget.max !== 'undefined') {
    const min = Number(budget.min);
    const max = Number(budget.max);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      return res.status(400).json({ message: 'Invalid budget: minimum cannot be greater than maximum' });
    }
  }
  const project = await Project.create({
    title: body.title,
    description: body.description,
    skills: body.skills || [],
    milestones: body.milestones || [],
    budget: body.budget || {},
    client: req.user._id,
    category: body.category,
    location: body.location,
    deadline: body.deadline,
    urgency: body.urgency || 'medium',
  });
  res.status(201).json(project);
};

export const update = async (req, res) => {
  try {
    // Only allow updating specific fields
    const allowedUpdates = {
      title: req.body.title,
      description: req.body.description,
      skills: req.body.skills,
      budget: req.body.budget,
      category: req.body.category,
      location: req.body.location,
      deadline: req.body.deadline,
      urgency: req.body.urgency
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    // If budget is being updated, validate min/max
    if (allowedUpdates.budget) {
      const b = allowedUpdates.budget;
      if (typeof b.min !== 'undefined' && typeof b.max !== 'undefined') {
        const min = Number(b.min);
        const max = Number(b.max);
        if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
          return res.status(400).json({ message: 'Invalid budget: minimum cannot be greater than maximum' });
        }
      }
    }

    // Only allow updates if project is in 'open' status and no one is hired yet
    const project = await Project.findOneAndUpdate(
      { 
        _id: req.params.id, 
        client: req.user._id,
        status: 'open',
        $or: [ { hiredBid: { $exists: false } }, { hiredBid: null } ]
      },
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found or cannot be updated in its current state' 
      });
    }

    res.json(project);
  } catch (error) {
    res.status(400).json({ 
      message: 'Error updating project', 
      error: error.message 
    });
  }
};

export const remove = async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, client: req.user._id });
  if (!project) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true });
};

// Complete a project
export const completeProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { finalRating, review, categories } = req.body;

    // Verify user is the client
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can complete projects' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify user owns the project
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(40).json({ message: 'Access denied' });
    }

    // Get hired freelancer
    const hiredBid = await Bid.findById(project.hiredBid)
      .populate('freelancer', 'name email')
      .lean();

    if (!hiredBid) {
      return res.status(400).json({ message: 'No hired freelancer found for this project' });
    }

    // Update project status
    await Project.findByIdAndUpdate(projectId, {
      status: 'completed',
      completedAt: new Date()
    });

    // Create final rating if provided
    let ratingData = null;
    if (finalRating) {
      const Rating = (await import('../models/Rating.js')).default;
      // Check for existing rating to avoid duplicate key error
      ratingData = await Rating.findOne({
        project: projectId,
        client: req.user._id,
        freelancer: hiredBid.freelancer._id,
      });
      if (!ratingData) {
        ratingData = await Rating.create({
          project: projectId,
          client: req.user._id,
          freelancer: hiredBid.freelancer._id,
          rating: finalRating,
          review: review,
          categories: categories
        });
      } else {
        // Optionally update the existing rating with new info
        ratingData = await Rating.findByIdAndUpdate(ratingData._id, {
          rating: finalRating,
          review: review,
          categories: categories
        }, { new: true });
      }
    }

    // Create final payment (remaining amount from bid)
    const Payment = (await import('../models/Payment.js')).default;
    const existingPayments = await Payment.find({ 
      project: projectId, 
      status: 'completed' 
    }).lean();
    
    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = Math.max(0, hiredBid.rate - totalPaid);

    if (remainingAmount > 0) {
      const finalPayment = await Payment.create({
        client: req.user._id,
        freelancer: hiredBid.freelancer._id,
        project: projectId,
        amount: remainingAmount,
        currency: 'INR',
        status: 'pending',
        paymentType: 'final_payment',
        paymentMethod: 'upi',
        description: `Final payment for project completion: ${project.title}`,
        metadata: {
          projectTitle: project.title,
          freelancerName: hiredBid.freelancer.name,
          clientName: req.user.name,
          totalBidAmount: hiredBid.rate,
          totalPaidAmount: totalPaid
        }
      });

      // Simulate final payment processing
      setTimeout(async () => {
        try {
          await Payment.findByIdAndUpdate(finalPayment._id, {
            status: 'completed',
            processedAt: new Date(),
            paymentDetails: {
              transactionId: `TXN${Date.now()}`,
              gateway: 'simulated',
              gatewayTransactionId: `GTX${Date.now()}`
            }
          });

          // Update freelancer's earnings
          const User = (await import('../models/User.js')).default;
          await User.findByIdAndUpdate(hiredBid.freelancer._id, {
            $inc: { totalEarnings: remainingAmount }
          });
        } catch (error) {
          console.error('Final payment processing error:', error);
        }
      }, 2000);
    }

    res.json({
      success: true,
      message: 'Project completed successfully',
      finalPayment: remainingAmount > 0 ? { amount: remainingAmount } : null,
      rating: ratingData
    });
  } catch (error) {
    console.error('Error completing project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get completed projects for history
export const getCompletedProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const filter = { status: 'completed' };
    
    // Filter by user role
    if (req.user.role === 'client') {
      filter.client = req.user._id;
    } else if (req.user.role === 'freelancer') {
      // Find projects where freelancer was hired
      const hiredBids = await Bid.find({ 
        freelancer: req.user._id, 
        status: 'hired' 
      }).select('project').lean();
      
      const projectIds = hiredBids.map(bid => bid.project);
      filter._id = { $in: projectIds };
    }

    const projects = await Project.find(filter)
      .populate('client', 'name avatar bio role email')
      .populate('hiredBid', 'rate timeline')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Project.countDocuments(filter);
    // Enrich each project with totalPaid and rating summary
    const Payment = (await import('../models/Payment.js')).default;
    const Rating = (await import('../models/Rating.js')).default;

    const enriched = await Promise.all(projects.map(async (project) => {
      // total paid for this project (only completed payments)
      const payments = await Payment.find({ project: project._id, status: 'completed' }).lean();
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // rating summary for this project
      const ratingAgg = await Rating.aggregate([
        { $match: { project: project._id } },
        { $group: { _id: '$project', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);
      const ratingData = (ratingAgg && ratingAgg[0]) ? ratingAgg[0] : { avgRating: 0, count: 0 };

      return {
        ...project,
        totalPaid,
        ratingAvg: Math.round((ratingData.avgRating || 0) * 10) / 10,
        ratingCount: ratingData.count || 0
      };
    }));

    res.json({
      projects: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching completed projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
