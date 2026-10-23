import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  roomType: { type: String, enum: ['project', 'team', 'direct'], required: true },
  roomId: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{ url: String, name: String, size: Number }],
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);





