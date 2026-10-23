import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePaymentStatus,
  getPaymentStats
} from '../controllers/paymentController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Payment routes
router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.get('/:paymentId', getPaymentById);
router.post('/', createPayment);
router.put('/:paymentId/status', updatePaymentStatus);

export default router;
