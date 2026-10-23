import Profile from '../models/Profile.js';
import User from '../models/User.js';

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', 'name email avatar role');
    
    if (!profile) {
      // Create default profile if doesn't exist
      const newProfile = new Profile({
        user: req.user.id,
        skills: [],
        portfolio: [],
        languages: [],
        education: [],
        certifications: []
      });
      await newProfile.save();
      await newProfile.populate('user', 'name email avatar role');
      const profileObj = newProfile.toObject();
      // Convert relative avatar URL to absolute URL
      if (profileObj.user?.avatar && profileObj.user.avatar.startsWith('/uploads/')) {
        const protocol = req.protocol;
        const host = req.get('host');
        profileObj.user.avatar = `${protocol}://${host}${profileObj.user.avatar}`;
      }
      return res.json(profileObj);
    }
    
    // Convert relative avatar URL to absolute URL
    const profileObj = profile.toObject();
    if (profileObj.user?.avatar && profileObj.user.avatar.startsWith('/uploads/')) {
      const protocol = req.protocol;
      const host = req.get('host');
      profileObj.user.avatar = `${protocol}://${host}${profileObj.user.avatar}`;
    }
    
    res.json(profileObj);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const {
      bio,
      skills,
      experience,
      hourlyRate,
      portfolio,
      socialLinks,
      location,
      availability,
      languages,
      education,
      certifications
    } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      {
        bio,
        skills: skills || [],
        experience,
        hourlyRate,
        portfolio: portfolio || [],
        socialLinks: socialLinks || {},
        location: location || {},
        availability,
        languages: languages || [],
        education: education || [],
        certifications: certifications || []
      },
      { new: true, upsert: true }
    ).populate('user', 'name email avatar role');

    // Convert relative avatar URL to absolute URL
    const profileObj = profile.toObject();
    if (profileObj.user?.avatar && profileObj.user.avatar.startsWith('/uploads/')) {
      const protocol = req.protocol;
      const host = req.get('host');
      profileObj.user.avatar = `${protocol}://${host}${profileObj.user.avatar}`;
    }

    res.json(profileObj);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create relative path for database storage
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Create absolute URL for frontend use
    const protocol = req.protocol; // 'http' or 'https'
    const host = req.get('host'); // e.g., 'localhost:4000'
    const absoluteUrl = `${protocol}://${host}${imageUrl}`;
    
    // Update user avatar (store relative URL in DB)
    await User.findByIdAndUpdate(req.user.id, { avatar: imageUrl });
    
    // Return absolute URL to frontend
    res.json({ imageUrl: absoluteUrl });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ message: 'Error uploading profile image' });
  }
};

// Get public profile (for other users to view)
export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await Profile.findOne({ user: userId })
      .populate('user', 'name avatar role')
      .select('-__v');
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Convert relative avatar URL to absolute URL
    const profileObj = profile.toObject();
    if (profileObj.user?.avatar && profileObj.user.avatar.startsWith('/uploads/')) {
      const protocol = req.protocol;
      const host = req.get('host');
      profileObj.user.avatar = `${protocol}://${host}${profileObj.user.avatar}`;
    }

    // Fetch recent ratings for this freelancer (for client to view)
    try {
      const Rating = (await import('../models/Rating.js')).default;
      const recent = await Rating.find({ freelancer: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('client', 'name avatar')
        .lean();

      profileObj.recentRatings = recent.map(r => ({
        rating: r.rating,
        review: r.review,
        categories: r.categories || {},
        createdAt: r.createdAt,
        client: r.client ? { name: r.client.name, avatar: r.client.avatar } : { name: 'Unknown' }
      }));
    } catch (err) {
      // Non-fatal: if ratings can't be fetched, continue without them
      console.error('Failed to fetch recent ratings for public profile:', err);
      profileObj.recentRatings = [];
    }

    res.json(profileObj);
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ message: 'Error fetching public profile' });
  }
};
