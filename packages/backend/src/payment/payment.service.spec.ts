import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { PaddlePaymentProvider } from './providers/paddle-payment.provider';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { PaymentProvider } from './interfaces/payment-provider.interface';
import { BillingStatus } from '../types';

// Mock Provider Factory
const createMockProvider = () => ({
  createCheckoutSession: jest.fn(),
  getUserSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  getBillingHistory: jest.fn(),
  handleWebhook: jest.fn(),
  updateSubscription: jest.fn(),
  processRefund: jest.fn(),
  getPaymentMethods: jest.fn(),
});

describe('PaymentService', () => {
  let service: PaymentService;
  let stripeProvider: StripePaymentProvider;
  let paddleProvider: PaddlePaymentProvider;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    subscriptionProvider: 'stripe',
    stripeSubscriptionId: 'sub_123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: StripePaymentProvider,
          useValue: createMockProvider(),
        },
        {
          provide: PaddlePaymentProvider,
          useValue: createMockProvider(),
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn(),
            },
            $transaction: jest.fn((cb) => cb(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    stripeProvider = module.get<StripePaymentProvider>(StripePaymentProvider);
    paddleProvider = module.get<PaddlePaymentProvider>(PaddlePaymentProvider);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should call stripe provider by default', async () => {
      await service.createCheckoutSession('user-id', 'price-id');
      expect(stripeProvider.createCheckoutSession).toHaveBeenCalledWith('user-id', 'price-id');
    });

    it('should call paddle provider when specified', async () => {
      await service.createCheckoutSession('user-id', 'price-id', 'paddle');
      expect(paddleProvider.createCheckoutSession).toHaveBeenCalledWith('user-id', 'price-id');
    });
  });

  describe('getUserSubscription', () => {
    it('should return subscription from paddle if provider is paddle', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'paddle',
      } as any);

      await service.getUserSubscription('user-id');
      expect(paddleProvider.getUserSubscription).toHaveBeenCalledWith('user-id');
    });

    it('should return subscription from stripe if provider is stripe', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);

      await service.getUserSubscription('user-id');
      expect(stripeProvider.getUserSubscription).toHaveBeenCalledWith('user-id');
    });

    it('should default to stripe if no provider set', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: null,
        stripeSubscriptionId: null,
      } as any);

      await service.getUserSubscription('user-id');
      expect(stripeProvider.getUserSubscription).toHaveBeenCalledWith('user-id');
    });

    it('should throw BadRequestException if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(service.getUserSubscription('user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel paddle subscription', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'paddle',
      } as any);

      await service.cancelSubscription('user-id');
      expect(paddleProvider.cancelSubscription).toHaveBeenCalledWith('user-id');
    });

    it('should cancel stripe subscription', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);

      await service.cancelSubscription('user-id');
      expect(stripeProvider.cancelSubscription).toHaveBeenCalledWith('user-id');
    });
  });

  describe('getBillingHistory', () => {
    it('should aggregate history from both providers', async () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-02-01');
      
      jest.spyOn(stripeProvider, 'getBillingHistory').mockResolvedValue([{ id: '1', date: date1, amount: 10, currency: 'USD', status: BillingStatus.PAID, pdfUrl: 'url' }]);
      jest.spyOn(paddleProvider, 'getBillingHistory').mockResolvedValue([{ id: '2', date: date2, amount: 20, currency: 'USD', status: BillingStatus.PAID, pdfUrl: 'url' }]);

      const result = await service.getBillingHistory('user-id');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // Newer date first
      expect(result[1].id).toBe('1');
    });

    it('should return empty array if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const result = await service.getBillingHistory('user-id');
      expect(result).toEqual([]);
    });
  });

  describe('handleWebhook', () => {
    it('should delegate to stripe provider', async () => {
      await service.handleWebhook('sig', {}, 'stripe');
      expect(stripeProvider.handleWebhook).toHaveBeenCalledWith('sig', {});
    });

    it('should delegate to paddle provider', async () => {
      await service.handleWebhook('sig', {}, 'paddle');
      expect(paddleProvider.handleWebhook).toHaveBeenCalledWith('sig', {});
    });
  });

  describe('updateSubscription', () => {
    it('should call updateSubscription on provider', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);

      await service.updateSubscription('user-id', 'new-price');
      expect((stripeProvider as any).updateSubscription).toHaveBeenCalledWith('user-id', 'new-price');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if provider does not support update', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);
      
      // Temporarily remove updateSubscription from mock
      const originalUpdate = (stripeProvider as any).updateSubscription;
      (stripeProvider as any).updateSubscription = undefined;

      await expect(service.updateSubscription('user-id', 'new-price')).rejects.toThrow(BadRequestException);
      
      // Restore
      (stripeProvider as any).updateSubscription = originalUpdate;
    });
  });

  describe('processRefund', () => {
    it('should call processRefund on provider', async () => {
       jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);

      await service.processRefund('user-id', 'tx-id');
      expect((stripeProvider as any).processRefund).toHaveBeenCalledWith('user-id', 'tx-id', undefined);
    });
  });

  describe('getPaymentMethods', () => {
    it('should call getPaymentMethods on provider', async () => {
       jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);

      await service.getPaymentMethods('user-id');
      expect((stripeProvider as any).getPaymentMethods).toHaveBeenCalledWith('user-id');
    });

     it('should return empty array if provider does not support getPaymentMethods', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        subscriptionProvider: 'stripe',
      } as any);
      
      // Temporarily remove getPaymentMethods from mock
      const originalMethod = (stripeProvider as any).getPaymentMethods;
      (stripeProvider as any).getPaymentMethods = undefined;

      const result = await service.getPaymentMethods('user-id');
      expect(result).toEqual([]);
      
      // Restore
      (stripeProvider as any).getPaymentMethods = originalMethod;
    });
  });
});
