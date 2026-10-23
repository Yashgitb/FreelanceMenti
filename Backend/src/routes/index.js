import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ensureProjectParticipant } from '../middleware/access.js';
import * as auth from '../controllers/authController.js';
import * as projects from '../controllers/projectController.js';
console.log('DEBUG: Imported projects controller:', projects);
import * as bids from '../controllers/bidController.js';
import * as messages from '../controllers/messageController.js';
import * as profile from '../controllers/profileController.js';
import * as chat from '../controllers/chatController.js';
import * as payment from '../controllers/paymentController.js';
import * as dashboard from '../controllers/dashboardController.js';
import timelineRoutes from './timelineRoutes.js';
import { seedDemo } from '../controllers/seedController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Auth
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', requireAuth, auth.me);

// Projects
router.get('/projects', projects.list);
router.get('/projects/:id', projects.detail);
router.post('/projects', requireAuth, requireRole('client'), projects.create);
router.put('/projects/:id', requireAuth, requireRole('client'), projects.update);
router.delete('/projects/:id', requireAuth, requireRole('client'), projects.remove);
router.get('/me/projects', requireAuth, requireRole('client'), projects.listMine);
router.get('/me/projects/completed', requireAuth, projects.getCompletedProjects);
router.post('/projects/:projectId/complete', requireAuth, requireRole('client'), projects.completeProject);

// Bids
router.get('/projects/:projectId/bids', requireAuth, bids.listByProject);
router.get('/projects/:projectId/bids/:bidId', requireAuth, bids.get);
router.post('/projects/:projectId/bids', requireAuth, requireRole('freelancer'), bids.submit);
router.post('/projects/:projectId/bids/:bidId/hire', requireAuth, requireRole('client'), bids.hire);
router.post('/projects/:projectId/bids/:bidId/reject', requireAuth, requireRole('client'), bids.reject);
// Unread / recent bid updates for current user
router.get('/bids/unread', requireAuth, bids.listUnread);
// Counter-offer endpoints (create and respond)
router.post('/projects/:projectId/bids/:bidId/counter-offer', requireAuth, bids.createCounterOffer);
router.post('/projects/:projectId/bids/:bidId/counter-offer/respond', requireAuth, bids.respondCounterOffer);

// Chat history
router.get('/projects/:projectId/messages', requireAuth, ensureProjectParticipant, messages.listByProject);

// File uploads (saved as messages with attachment)
const uploadDir = path.resolve('Backend/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post('/projects/:projectId/files', requireAuth, ensureProjectParticipant, upload.single('file'), async (req, res) => {
  try {
    const fileUrl = `/uploads/${req.file.filename}`;
    const Message = (await import('../models/Message.js')).default;
    const msg = await Message.create({
      roomType: 'project',
      roomId: String(req.params.projectId),
      sender: req.user._id,
      content: req.body.caption || '',
      attachments: [{ url: fileUrl, name: req.file.originalname, size: req.file.size }],
    });
    res.status(201).json(msg);
  } catch (e) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Simple file upload for workspace
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ 
      url: fileUrl, 
      name: req.file.originalname, 
      size: req.file.size 
    });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Profile routes
router.get('/profile', requireAuth, profile.getProfile);
router.put('/profile', requireAuth, profile.updateProfile);
router.post('/profile/upload-image', requireAuth, upload.single('image'), profile.uploadProfileImage);
router.get('/profile/public/:userId', requireAuth, profile.getPublicProfile);

// Chat routes
router.get('/chat/conversations', requireAuth, chat.getConversations);
router.get('/chat/conversation/:userId', requireAuth, chat.getOrCreateConversation);
router.get('/chat/conversation/:conversationId/messages', requireAuth, chat.getConversationMessages);
router.post('/chat/conversation/:conversationId/messages', requireAuth, chat.sendMessage);
router.get('/chat/project/:projectId/conversation', requireAuth, chat.getProjectConversation);

// Payment routes
router.get('/payments', requireAuth, payment.getPayments);
router.get('/payments/stats', requireAuth, payment.getPaymentStats);
router.get('/payments/:paymentId', requireAuth, payment.getPaymentById);
router.post('/payments', requireAuth, payment.createPayment);
router.put('/payments/:paymentId/status', requireAuth, payment.updatePaymentStatus);

// Task completion and payment routes
router.post('/timeline/:itemId/complete', requireAuth, payment.completeTask);
router.post('/timeline/:itemId/partial-payment', requireAuth, payment.createPartialPayment);
router.get('/projects/:projectId/payments', requireAuth, payment.getProjectPayments);
router.get('/projects/:projectId/ratings', requireAuth, payment.getProjectRatings);
router.get('/freelancers/:freelancerId/ratings', requireAuth, payment.getFreelancerRatings);
router.get('/projects/:projectId/payment-stats', requireAuth, payment.getPaymentStats);
router.post('/payments/:paymentId/simulate', requireAuth, payment.simulatePayment);

// Timeline routes
router.use(timelineRoutes);

// Dashboard routes
router.get('/dashboard/stats', requireAuth, dashboard.getDashboardStats);
router.get('/dashboard/activity', requireAuth, dashboard.getRecentActivity);
router.get('/dashboard/tasks', requireAuth, dashboard.getUpcomingTasks);
router.get('/dashboard/payments', requireAuth, dashboard.getPaymentSummary);

// Seed demo data (non-production use)
if (process.env.NODE_ENV !== 'production') {
  router.post('/seed/demo', seedDemo);
}

export default router;




