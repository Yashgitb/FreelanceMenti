import { http } from './http';

export interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    avatar?: string;
    role: 'client' | 'freelancer';
  }>;
  project?: {
    _id: string;
    title: string;
  };
  lastMessage?: Message;
  lastMessageAt: string;
  isActive: boolean;
  type: 'direct' | 'project' | 'group';
  title?: string;
  createdBy: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  type: 'text' | 'file' | 'image';
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const chatAPI = {
  // Get user's conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await http.get('/chat/conversations');
    return response.data;
  },

  // Get or create conversation with user
  getOrCreateConversation: async (userId: string): Promise<Conversation> => {
    const response = await http.get(`/chat/conversation/${userId}`);
    return response.data;
  },

  // Get conversation messages
  getConversationMessages: async (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<Message[]> => {
    const response = await http.get(`/chat/conversation/${conversationId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  },

  // Send message
  sendMessage: async (
    conversationId: string,
    content: string,
    type: 'text' | 'file' | 'image' = 'text',
    attachments: any[] = []
  ): Promise<Message> => {
    const response = await http.post(`/chat/conversation/${conversationId}/messages`, {
      content,
      type,
      attachments
    });
    return response.data;
  },

  // Get project conversation
  getProjectConversation: async (projectId: string): Promise<Conversation> => {
    const response = await http.get(`/chat/project/${projectId}/conversation`);
    return response.data;
  },
};
