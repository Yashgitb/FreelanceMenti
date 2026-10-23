import Project from '../models/Project.js';

export const ensureProjectParticipant = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate('hiredBid');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isClient = String(project.client) === String(req.user._id);
    let isHiredFreelancer = false;
    if (project.hiredBid) {
      // hiredBid may be ObjectId or populated doc; ensure we can compare freelancer
      const hiredBidDoc = project.hiredBid.freelancer ? project.hiredBid : null;
      if (hiredBidDoc) {
        isHiredFreelancer = String(hiredBidDoc.freelancer) === String(req.user._id);
      }
    }

    if (Array.isArray(project.hiredFreelancers) && project.hiredFreelancers.length > 0) {
      if (project.hiredFreelancers.some(hf => String(hf.freelancer || hf) === String(req.user._id))) {
        isHiredFreelancer = true;
      }
    }

    const hasHired = Boolean(project.hiredBid || (Array.isArray(project.hiredFreelancers) && project.hiredFreelancers.length > 0));

    if (!hasHired) {
      return res.status(403).json({ message: 'Workspace is only available after at least one freelancer is hired' });
    }

    if (!isClient && !isHiredFreelancer) {
      return res.status(403).json({ message: 'Forbidden: You are not an active participant in this project workspace' });
    }
    req.project = project;
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Access check failed' });
  }
};



