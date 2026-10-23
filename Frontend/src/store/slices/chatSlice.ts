import { createSlice } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatState {
  rooms: Array<{
    id: string;
    name: string;
    projectId: string;
    unreadCount: number;
  }>;
  activeRoom: string | null;
  messages: Record<string, Message[]>;
}

const initialState: ChatState = {
  rooms: [],
  activeRoom: null,
  messages: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setRooms: (state, action) => {
      state.rooms = action.payload;
    },
    setActiveRoom: (state, action) => {
      state.activeRoom = action.payload;
    },
    addMessage: (state, action) => {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      state.messages[roomId].push(message);
    },
  },
});

export const { setRooms, setActiveRoom, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
