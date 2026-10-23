import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import bidReducer from './slices/bidSlice';
import teamReducer from './slices/teamSlice';
import taskReducer from './slices/taskSlice';
import chatReducer from './slices/chatSlice';
import paymentReducer from './slices/paymentSlice';
import portfolioReducer from './slices/portfolioSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    bid: bidReducer,
    team: teamReducer,
    task: taskReducer,
    chat: chatReducer,
    payment: paymentReducer,
    portfolio: portfolioReducer,
    notification: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
