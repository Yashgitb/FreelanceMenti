import Message from '../models/Message.js';

export const listByProject = async (req, res) => {
  const { projectId } = req.params;
  const messages = await Message.find({ roomType: 'project', roomId: String(projectId) })
    .sort({ createdAt: 1 })
    .populate('sender', 'name avatar')
    .lean();
  res.json(messages);
};



