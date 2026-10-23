import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    enum: ['Entry', 'Intermediate', 'Expert'],
    default: 'Entry'
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  portfolio: [{
    title: String,
    description: String,
    imageUrl: String,
    projectUrl: String,
    technologies: [String]
  }],
  socialLinks: {
    website: String,
    linkedin: String,
    github: String,
    twitter: String
  },
  location: {
    city: String,
    country: String
  },
  availability: {
    type: String,
    enum: ['Available', 'Busy', 'Unavailable'],
    default: 'Available'
  },
  languages: [{
    name: String,
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Native'],
      default: 'Intermediate'
    }
  }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    startYear: Number,
    endYear: Number,
    current: Boolean
  }],
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String
  }]
}, {
  timestamps: true
});

export default mongoose.model('Profile', profileSchema);
