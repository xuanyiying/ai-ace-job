import {
  SubscriptionTier,
  SubscriptionStatus,
  BillingStatus,
} from '../types';
import axios from '../config/axios';

export interface SubscriptionDetails {
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  expiresAt?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
}

export interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: BillingStatus;
  date: string;
  pdfUrl: string;
}

export const paymentService = {
  createCheckoutSession: async (
    priceId: string,
    provider: 'stripe' | 'paddle' = 'stripe'
  ) => {
    const response = await axios.post('/payments/create-checkout-session', {
      priceId,
      provider,
    });
    return response.data;
  },

  getUserSubscription: async (): Promise<SubscriptionDetails> => {
    const response = await axios.get('/payments/subscription');
    return response.data;
  },

  cancelSubscription: async () => {
    const response = await axios.post('/payments/cancel-subscription');
    return response.data;
  },

  getBillingHistory: async (): Promise<BillingRecord[]> => {
    const response = await axios.get('/payments/billing-history');
    return response.data;
  },
};
