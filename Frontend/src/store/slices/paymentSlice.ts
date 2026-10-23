import { createSlice } from '@reduxjs/toolkit';

interface PaymentState {
  byProjectId: Record<string, {
    escrow: {
      amount: number;
      held: number;
      released: number;
    };
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      date: string;
      status: string;
    }>;
  }>;
}

const initialState: PaymentState = {
  byProjectId: {},
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setProjectPayment: (state, action) => {
      state.byProjectId[action.payload.projectId] = action.payload.data;
    },
  },
});

export const { setProjectPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
