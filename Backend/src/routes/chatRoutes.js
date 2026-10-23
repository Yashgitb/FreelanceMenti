import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getConversations,
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  getProjectConversation
} from '../controllers/chatController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Conversation routes
router.get('/conversations', getConversations);
router.get('/conversation/:userId', getOrCreateConversation);
router.get('/conversation/:conversationId/messages', getConversationMessages);
router.post('/conversation/:conversationId/messages', sendMessage);
router.get('/project/:projectId/conversation', getProjectConversation);

export default router;
