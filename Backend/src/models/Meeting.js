import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  title: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  invitees: [{ email: String, name: String }],
  notes: { type: String },
  roomId: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Meeting', MeetingSchema);





