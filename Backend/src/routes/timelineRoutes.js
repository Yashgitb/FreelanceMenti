import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProjectTimeline,
  createTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
  addComment,
  getTimelineStats
} from '../controllers/timelineController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get timeline for a project
router.get('/projects/:projectId/timeline', getProjectTimeline);

// Get timeline statistics for a project
router.get('/projects/:projectId/timeline/stats', getTimelineStats);

// Create a new timeline item
router.post('/projects/:projectId/timeline', createTimelineItem);

// Update a timeline item
router.put('/timeline/:itemId', updateTimelineItem);

// Delete a timeline item
router.delete('/timeline/:itemId', deleteTimelineItem);

// Add comment to timeline item
router.post('/timeline/:itemId/comments', addComment);

export default router;
