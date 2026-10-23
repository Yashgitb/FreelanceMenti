import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  value: { type: Number, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'released'], default: 'pending' },
}, { _id: true, timestamps: true });

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skills: [{ type: String, index: true }],
  milestones: [MilestoneSchema],
  budget: { min: Number, max: Number },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open' },
  postedAt: { type: Date, default: Date.now },
  category: { type: String },
  location: { type: String },
  deadline: { type: Date },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  hiredBid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
}, { timestamps: true });

export default mongoose.model('Project', ProjectSchema);
export const Milestone = mongoose.model('Milestone', MilestoneSchema);





