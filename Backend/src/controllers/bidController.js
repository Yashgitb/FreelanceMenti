import Bid from '../models/Bid.js';
import Project from '../models/Project.js';

export const listByProject = async (req, res) => {
  const bids = await Bid.find({ project: req.params.projectId }).populate('freelancer', 'name avatar').sort({ createdAt: -1 });
  res.json(bids);
};

export const submit = async (req, res) => {
  try {
    const { projectId } = req.params;
    let { coverLetter, rate, timeline } = req.body;

    // Basic server-side validation to avoid unhandled mongoose ValidationError
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (typeof rate === 'undefined' || rate === null || rate === '') {
      return res.status(400).json({ message: 'Rate is required' });
    }
    // normalize rate to number
    const numericRate = parseFloat(rate);
    if (Number.isNaN(numericRate) || numericRate <= 0) {
      return res.status(400).json({ message: 'Invalid rate' });
    }
    // enforce project budget bounds when present
    if (project.budget && (typeof project.budget.min === 'number' || typeof project.budget.max === 'number')) {
      const min = typeof project.budget.min === 'number' ? project.budget.min : -Infinity;
      const max = typeof project.budget.max === 'number' ? project.budget.max : Infinity;
      if (numericRate < min || numericRate > max) {
        return res.status(400).json({ message: `Bid rate must be between ${min} and ${max}` });
      }
    }
    if (!timeline || String(timeline).trim() === '') {
      return res.status(400).json({ message: 'Timeline is required' });
    }

    // If coverLetter is missing or empty, provide a short default instead of letting Mongoose throw
    if (typeof coverLetter === 'undefined' || coverLetter === null || String(coverLetter).trim() === '') {
      coverLetter = 'No cover letter provided';
    }

  const bid = await Bid.create({ project: projectId, freelancer: req.user._id, coverLetter, rate: numericRate, timeline });
    res.status(201).json(bid);
  } catch (err) {
    // If mongoose validation error, return 400 with details
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, errors: err.errors });
    }
    console.error('Error creating bid:', err);
    res.status(500).json({ message: 'Failed to submit bid' });
  }
};

export const hire = async (req, res) => {
  const { projectId, bidId } = req.params;
  const project = await Project.findOne({ _id: projectId, client: req.user._id });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const bid = await Bid.findOneAndUpdate({ _id: bidId, project: projectId }, { status: 'hired' }, { new: true });
  if (!bid) return res.status(404).json({ message: 'Bid not found' });
  project.hiredBid = bid._id;
  project.status = 'in_progress';
  await project.save();
  res.json(bid);
};

export const reject = async (req, res) => {
  const { projectId, bidId } = req.params;
  const project = await Project.findOne({ _id: projectId, client: req.user._id });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const bid = await Bid.findOneAndUpdate({ _id: bidId, project: projectId }, { status: 'rejected' }, { new: true });
  if (!bid) return res.status(404).json({ message: 'Bid not found' });
  res.json(bid);
};

// Return bids relevant to the current user. The frontend expects an endpoint
// at GET /bids/unread to fetch recent bid updates for the logged-in user.
// This implementation returns recent bids for freelancers (their bids)
// and for clients (bids on their projects). It does not attempt to compute
// a true "unread" status (schema lacks isRead) but provides a reasonable
// feed of recent bid activity so the Messages UI can render.
export const listUnread = async (req, res) => {
  try {
    const user = req.user;
    let bids = [];

    if (user.role === 'freelancer') {
      bids = await Bid.find({ freelancer: user._id })
        .populate('project', 'title budget hiredBid')
        .populate('freelancer', 'name avatar')
        .sort({ updatedAt: -1 })
        .lean();
    } else {
      // client: find projects owned by client, then bids for those projects
      const projects = await Project.find({ client: user._id }).select('_id');
      const projectIds = projects.map(p => p._id);
      bids = await Bid.find({ project: { $in: projectIds } })
        .populate('project', 'title budget hiredBid')
        .populate('freelancer', 'name avatar')
        .sort({ updatedAt: -1 })
        .lean();
    }

    // Ensure expected properties exist for frontend compatibility
    bids = bids.map(b => ({
      ...b,
      counterOffers: b.counterOffers || [],
      currentCounterOffer: b.currentCounterOffer || null,
      lastActionBy: b.lastActionBy || null,
      isRead: !!b.isRead || false,
    }));

    res.json(bids);
  } catch (err) {
    console.error('Error fetching unread bids:', err);
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
};

export const get = async (req, res) => {
  try {
    const { projectId, bidId } = req.params;
    const bid = await Bid.findOne({ _id: bidId, project: projectId })
      .populate('freelancer', 'name avatar profile')
      .populate('project', 'title budget client hiredBid');

    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Authorization: allow project client or the freelancer who made the bid
    const isClient = String(bid.project.client) === String(req.user._id);
    const isBidOwner = String(bid.freelancer._id) === String(req.user._id);
    if (!isClient && !isBidOwner) return res.status(403).json({ message: 'Forbidden' });

    res.json(bid);
  } catch (err) {
    console.error('Error fetching bid:', err);
    res.status(500).json({ message: 'Failed to fetch bid' });
  }
};

// Create a counter-offer on a bid
export const createCounterOffer = async (req, res) => {
  try {
    const { projectId, bidId } = req.params;
    const { amount, message } = req.body;

    const bid = await Bid.findOne({ _id: bidId, project: projectId });
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Prevent creating counter-offers once negotiation is finalized/hired
    if (bid.status === 'hired') {
      return res.status(400).json({ message: 'Negotiation closed: bid already hired' });
    }

    // Only project client or the freelancer who owns the bid can create a counter-offer
    const isClient = String(bid.project) && false; // we will check project owner below
  const projectOwner = await Project.findById(projectId).select('client');
  const requesterIsClient = String(projectOwner.client) === String(req.user._id);
    const requesterIsBidOwner = String(bid.freelancer) === String(req.user._id);
    if (!requesterIsClient && !requesterIsBidOwner) return res.status(403).json({ message: 'Forbidden' });

    const createdBy = requesterIsClient ? 'client' : 'freelancer';

    const coAmount = typeof amount !== 'undefined' && amount !== null && amount !== '' ? parseFloat(amount) : Number(bid.rate || 0);
    if (Number.isNaN(coAmount) || coAmount <= 0) {
      return res.status(400).json({ message: 'Invalid counter-offer amount' });
    }
    
    // enforce project budget bounds when present
    const projectBudget = await Project.findById(projectId).select('budget');
    if (projectBudget && projectBudget.budget && (typeof projectBudget.budget.min === 'number' || typeof projectBudget.budget.max === 'number')) {
      const min = typeof projectBudget.budget.min === 'number' ? projectBudget.budget.min : -Infinity;
      const max = typeof projectBudget.budget.max === 'number' ? projectBudget.budget.max : Infinity;
      if (coAmount < min || coAmount > max) {
        return res.status(400).json({ message: `Counter-offer must be between ${min} and ${max}` });
      }
    }

    // Get the latest bid amount for behavioral validation
    const getLatestBidAmount = () => {
      if (bid.counterOffers && bid.counterOffers.length > 0) {
        const sortedOffers = [...bid.counterOffers].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sortedOffers[0].amount;
      }
      return bid.rate;
    };

    // Behavioral validation to prevent unrealistic counter bidding
    const latestAmount = getLatestBidAmount();
    
    if (requesterIsClient) {
      // Clients should generally negotiate down (but allow same amount)
      if (coAmount > latestAmount) {
        return res.status(400).json({ 
          message: `As a client, you should negotiate towards a lower amount. Current offer is ${latestAmount}` 
        });
      }
    } else if (requesterIsBidOwner) {
      // Freelancers can defend their rate but should be reasonable (max 25% increase)
      const increasePercentage = ((coAmount - latestAmount) / latestAmount) * 100;
      
      if (increasePercentage > 25) {
        return res.status(400).json({ 
          message: `Counter offer increase seems excessive (${increasePercentage.toFixed(1)}% increase). Consider a more reasonable adjustment.` 
        });
      }
    }

    const co = {
      amount: coAmount,
      message: message || '',
      createdBy,
      status: 'pending',
      createdAt: new Date(),
    };

    bid.counterOffers = bid.counterOffers || [];
    bid.counterOffers.push(co);
    bid.currentCounterOffer = co;
    bid.lastActionBy = createdBy;
    await bid.save();

    const populated = await Bid.findById(bid._id)
      .populate('freelancer', 'name avatar')
      .populate('project', 'title budget client hiredBid');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating counter-offer:', err);
    res.status(500).json({ message: 'Failed to create counter-offer' });
  }
};

// Respond (accept/reject) to the current counter-offer
export const respondCounterOffer = async (req, res) => {
  try {
    const { projectId, bidId } = req.params;
    const { status } = req.body; // expected 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const bid = await Bid.findOne({ _id: bidId, project: projectId });
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    // Prevent responding once negotiation is finalized/hired
    if (bid.status === 'hired') {
      return res.status(400).json({ message: 'Negotiation already finalized' });
    }

  const projectOwner = await Project.findById(projectId).select('client');
  const requesterIsClient = String(projectOwner.client) === String(req.user._id);
    const requesterIsBidOwner = String(bid.freelancer) === String(req.user._id);
    // Only the other party (not the one who created the CO) can respond
    const co = bid.currentCounterOffer || (bid.counterOffers && bid.counterOffers[bid.counterOffers.length - 1]);
    if (!co) return res.status(400).json({ message: 'No counter-offer to respond to' });

    const coCreator = co.createdBy;
    const responderIsClient = requesterIsClient;
    const responderIsBidOwner = requesterIsBidOwner;
    // If co creator was client, only freelancer (bid owner) may respond and vice versa
    if (coCreator === 'client' && !responderIsBidOwner) return res.status(403).json({ message: 'Forbidden' });
    if (coCreator === 'freelancer' && !responderIsClient) return res.status(403).json({ message: 'Forbidden' });

    // Find the matching subdoc and update
    const idx = bid.counterOffers ? bid.counterOffers.length - 1 : -1;
    if (idx >= 0) {
      bid.counterOffers[idx].status = status;
      if (!bid.counterOffers[idx].createdAt) bid.counterOffers[idx].createdAt = new Date();
    }
    bid.currentCounterOffer = { ...bid.counterOffers[idx] };
    bid.lastActionBy = responderIsClient ? 'client' : 'freelancer';

    // If accepted, update bid rate/timeline/status as appropriate (simple approach: set rate to counter amount and mark accepted)
    if (status === 'accepted' && bid.counterOffers[idx] && bid.counterOffers[idx].amount) {
      const acceptedAmount = parseFloat(bid.counterOffers[idx].amount);
      // validate accepted amount against project budget
      const projectBudget = await Project.findById(projectId).select('budget');
      if (projectBudget && projectBudget.budget && (typeof projectBudget.budget.min === 'number' || typeof projectBudget.budget.max === 'number')) {
        const min = typeof projectBudget.budget.min === 'number' ? projectBudget.budget.min : -Infinity;
        const max = typeof projectBudget.budget.max === 'number' ? projectBudget.budget.max : Infinity;
        if (acceptedAmount < min || acceptedAmount > max) {
          return res.status(400).json({ message: `Accepted amount must be between ${min} and ${max}` });
        }
      }
      // When a counter-offer is accepted, finalize the negotiation: update bid rate
      // and mark the bid as hired, and update the project to reflect the hired bid.
      bid.rate = bid.counterOffers[idx].amount;
      bid.status = 'hired';

      // Update project to mark this bid as the hired bid and set project status to in_progress
      try {
        const project = await Project.findById(projectId);
        if (project) {
          project.hiredBid = bid._id;
          project.status = 'in_progress';
          await project.save();
        }
      } catch (err) {
        console.error('Failed to update project after accepting counter-offer:', err);
      }
    }

    await bid.save();

    const populated = await Bid.findById(bid._id).populate('freelancer', 'name avatar').populate('project', 'title budget client');
    res.json(populated);
  } catch (err) {
    console.error('Error responding to counter-offer:', err);
    res.status(500).json({ message: 'Failed to respond to counter-offer' });
  }
};




