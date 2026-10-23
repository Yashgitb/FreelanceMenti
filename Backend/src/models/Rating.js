import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema({
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true, 
    index: true 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  freelancer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  review: { 
    type: String, 
    maxlength: 500 
  },
  categories: {
    communication: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    timeliness: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 }
  },
  timelineItem: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Timeline' 
  }
}, { timestamps: true });

// Ensure one rating per project per client-freelancer pair
RatingSchema.index({ project: 1, client: 1, freelancer: 1 }, { unique: true });

export default mongoose.model('Rating', RatingSchema);
