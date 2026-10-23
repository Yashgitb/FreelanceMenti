import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Bid from '../models/Bid.js';

export const seedDemo = async (req, res) => {
  await User.deleteMany({});
  await Project.deleteMany({});
  await Bid.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);
  const client = await User.create({ name: 'Demo Client', email: 'client@example.com', passwordHash, role: 'client' });
  const freelancer = await User.create({ name: 'Demo Freelancer', email: 'freelancer@example.com', passwordHash, role: 'freelancer' });

  const project = await Project.create({
    title: 'Build a React Dashboard',
    description: 'Create a responsive dashboard with charts and tables',
    skills: ['react', 'typescript', 'tailwind'],
    budget: { min: 20, max: 50 },
    client: client._id,
  });

  const bid = await Bid.create({ project: project._id, freelancer: freelancer._id, coverLetter: 'I can deliver in 3 weeks', rate: 2000, timeline: '3 weeks' });

  res.json({ client, freelancer, project, bid });
};



