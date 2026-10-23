import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  timelineItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timeline'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentType: {
    type: String,
    enum: ['task_completion', 'partial_payment', 'milestone', 'final_payment'],
    default: 'task_completion'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'escrow'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    gateway: String,
    gatewayTransactionId: String,
    paymentMethodId: String
  },
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  processedAt: Date,
  failureReason: String,
  // For partial payments
  isPartial: {
    type: Boolean,
    default: false
  },
  partialPercentage: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

export default mongoose.model('Payment', paymentSchema);
