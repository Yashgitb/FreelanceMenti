import { createSlice } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'bid' | 'message' | 'payment' | 'project';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n: Notification) => !n.read).length;
    },
    markAsRead: (state, action) => {
      const notification = state.items.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
  },
});

export const { setNotifications, markAsRead } = notificationSlice.actions;
export default notificationSlice.reducer;
