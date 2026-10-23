import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

// Get user's conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
      isActive: true
    })
    .populate('participants', 'name avatar role')
    .populate('project', 'title')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
};

// Get or create conversation between users
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId] },
      type: 'direct',
      isActive: true
    }).populate('participants', 'name avatar role');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [req.user.id, userId],
        type: 'direct',
        createdBy: req.user.id
      });
      await conversation.save();
      await conversation.populate('participants', 'name avatar role');
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Error creating conversation' });
  }
};

// Get conversation messages
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text', attachments = [] } = req.body;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: req.user.id,
      content,
      type,
      attachments
    });

    await message.save();
    await message.populate('sender', 'name avatar');

    // Update conversation last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

// Get project conversation
export const getProjectConversation = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { client: req.user.id },
        { hiredFreelancer: req.user.id }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    let conversation = await Conversation.findOne({
      project: projectId,
      type: 'project',
      isActive: true
    }).populate('participants', 'name avatar role');

    if (!conversation) {
      // Create project conversation
      const participants = [project.client];
      if (project.hiredFreelancer) {
        participants.push(project.hiredFreelancer);
      }

      conversation = new Conversation({
        participants,
        project: projectId,
        type: 'project',
        createdBy: project.client
      });
      await conversation.save();
      await conversation.populate('participants', 'name avatar role');
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching project conversation:', error);
    res.status(500).json({ message: 'Error fetching project conversation' });
  }
};
