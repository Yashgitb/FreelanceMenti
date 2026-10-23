import mongoose from 'mongoose';

const BidSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coverLetter: { type: String, required: true },
  rate: { type: Number, required: true },
  timeline: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'hired'], default: 'pending' },
  // Counter-offers subdocuments allow a negotiation thread between client and freelancer
  counterOffers: [
    {
      amount: { type: Number },
      message: { type: String },
      createdBy: { type: String, enum: ['client', 'freelancer'] },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
      createdAt: { type: Date, default: Date.now },
    }
  ],
  // Mirror of the active/last counter offer for quick access
  currentCounterOffer: {
    amount: { type: Number },
    message: { type: String },
    createdBy: { type: String, enum: ['client', 'freelancer'] },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    createdAt: { type: Date },
  },
  lastActionBy: { type: String, enum: ['client', 'freelancer'] },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Bid', BidSchema);





