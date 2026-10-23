import mongoose from 'mongoose';

const TimelineSchema = new mongoose.Schema({
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true, 
    index: true 
  },
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['milestone', 'task', 'note', 'deadline'], 
    default: 'task' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  dueDate: { type: Date },
  completedAt: { type: Date },
  estimatedHours: { type: Number },
  actualHours: { type: Number },
  attachments: [{
    name: String,
    url: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  dependencies: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Timeline' 
  }],
  tags: [{ type: String }],
  order: { type: Number, default: 0 }
}, { timestamps: true });

// Optional payment fields for task-level escrow/partial payments
TimelineSchema.add({
  paymentAmount: { type: Number, min: 0 },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  paymentReleased: { type: Boolean, default: false }
});

// Index for efficient queries
TimelineSchema.index({ project: 1, createdAt: -1 });
TimelineSchema.index({ assignedTo: 1, status: 1 });
TimelineSchema.index({ dueDate: 1 });

export default mongoose.model('Timeline', TimelineSchema);
