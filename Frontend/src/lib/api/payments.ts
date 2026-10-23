import { http } from './http';

export interface Payment {
  _id: string;
  client: {
    _id: string;
    name: string;
    avatar?: string;
  };
  freelancer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  project: {
    _id: string;
    title: string;
  };
  timelineItem?: {
    _id: string;
    title: string;
  };
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentType: 'task_completion' | 'partial_payment' | 'milestone' | 'final_payment';
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'wallet' | 'bank_transfer';
  paymentDetails?: {
    transactionId?: string;
    gateway?: string;
    gatewayTransactionId?: string;
    paymentMethodId?: string;
  };
  description?: string;
  metadata?: {
    taskTitle?: string;
    freelancerName?: string;
    clientName?: string;
  };
  processedAt?: string;
  failureReason?: string;
  isPartial?: boolean;
  partialPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  totalPayments: number;
  completedPayments: number;
  // Sum of completed payment amounts (total earnings)
  totalEarnings: number;
  // Sum of completed payment amounts this month
  monthlyEarnings: number;
  // Sum of payments currently pending/processing
  pendingAmount: number;
  // Sum of remaining amount for the whole project (hired bid minus sent amount)
  projectRemaining?: number;
  // Sum of expected remaining amounts for active/incomplete tasks (not yet fully invoiced)
  expectedRemaining?: number;
  // Optional breakdown of remaining per timeline item
  remainingBreakdown?: Array<{
    timelineItemId: string;
    title?: string;
    expected: number;
    paid: number;
    remaining: number;
  }>;
  // Breakdown by status: count and amount
  statusBreakdown: {
    [status: string]: {
      count: number;
      amount: number;
    };
  };
}

export interface Rating {
  _id: string;
  project: {
    _id: string;
    title: string;
  };
  client: {
    _id: string;
    name: string;
    avatar?: string;
  };
  freelancer: {
    _id: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  review?: string;
  categories?: {
    communication?: number;
    quality?: number;
    timeliness?: number;
    professionalism?: number;
  };
  timelineItem?: {
    _id: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
  ratings: Rating[];
  averageRating: number;
  totalRatings: number;
}

export interface CompleteTaskData {
  rating?: number;
  review?: string;
  categories?: {
    communication?: number;
    quality?: number;
    timeliness?: number;
    professionalism?: number;
  };
  paymentMethod?: string;
}

export interface PartialPaymentData {
  amount?: number;
  percentage?: number;
  paymentMethod?: string;
}

export const paymentsAPI = {
  // Get payments for current user
  getPayments: async (page: number = 1, limit: number = 10, status?: string): Promise<{payments: Payment[], pagination: any}> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status })
      });
      const response = await http.get(`/payments?${params}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      throw error;
    }
  },

  // Get payment statistics
  getPaymentStats: async (): Promise<PaymentStats> => {
    try {
      const response = await http.get('/payments/stats');
      return response;
    } catch (error) {
      console.error('Failed to fetch payment stats:', error);
      throw error;
    }
  },

  // Get payment by ID
  getPaymentById: async (paymentId: string): Promise<Payment> => {
    try {
      const response = await http.get(`/payments/${paymentId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      throw error;
    }
  },

  // Create payment
  createPayment: async (data: {
    projectId: string;
    freelancerId: string;
    amount: number;
    description?: string;
    paymentMethod?: string;
  }): Promise<Payment> => {
    try {
      const response = await http.post('/payments', data);
      return response;
    } catch (error) {
      console.error('Failed to create payment:', error);
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (paymentId: string, status: string): Promise<void> => {
    try {
      await http.put(`/payments/${paymentId}/status`, { status });
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  },

  // Complete a task and create payment
  completeTask: async (itemId: string, data: CompleteTaskData): Promise<{payment: Payment, rating?: Rating}> => {
    try {
      const response = await http.post(`/timeline/${itemId}/complete`, data);
      return response;
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  },

  // Create partial payment for a task
  createPartialPayment: async (itemId: string, data: PartialPaymentData): Promise<{payment: Payment}> => {
    try {
      const response = await http.post(`/timeline/${itemId}/partial-payment`, data);
      return response;
    } catch (error) {
      console.error('Failed to create partial payment:', error);
      throw error;
    }
  },

  // Get payments for a project
  getProjectPayments: async (projectId: string): Promise<Payment[]> => {
    try {
      const response = await http.get(`/projects/${projectId}/payments`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Failed to fetch project payments:', error);
      return [];
    }
  },

  // Get freelancer ratings
  getFreelancerRatings: async (freelancerId: string): Promise<RatingStats> => {
    try {
      const response = await http.get(`/freelancers/${freelancerId}/ratings`);
      return response;
    } catch (error) {
      console.error('Failed to fetch freelancer ratings:', error);
      throw error;
    }
  },

  // Get project payment statistics
  getProjectPaymentStats: async (projectId: string): Promise<PaymentStats> => {
    try {
      const response = await http.get(`/projects/${projectId}/payment-stats`);
      return response;
    } catch (error) {
      console.error('Failed to fetch project payment stats:', error);
      throw error;
    }
  },

  // Simulate payment processing
  simulatePayment: async (paymentId: string, status: string = 'completed'): Promise<void> => {
    try {
      await http.post(`/payments/${paymentId}/simulate`, { status });
    } catch (error) {
      console.error('Failed to simulate payment:', error);
      throw error;
    }
  },
};