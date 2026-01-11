import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment, Paddle, EventName } from '@paddle/paddle-node-sdk';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';
import {
  PaymentProvider,
  SubscriptionDetails,
  BillingRecord,
} from '../interfaces/payment-provider.interface';
import { SubscriptionStatus, BillingStatus } from '@/types';

@Injectable()
export class PaddlePaymentProvider implements PaymentProvider {
  private readonly paddle: Paddle | null = null;
  private readonly logger = new Logger(PaddlePaymentProvider.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    const paddleApiKey = this.configService.get('PADDLE_API_KEY');
    if (paddleApiKey) {
      this.paddle = new Paddle(paddleApiKey, {
        environment: Environment.sandbox,
      });
    } else {
      this.logger.error('PADDLE_API_KEY not found');
    }
  }

  async createCheckoutSession(userId: string, priceId: string) {
    if (!this.paddle) {
      this.logger.error('Paddle is not configured');
      throw new BadRequestException('Paddle is not configured');
    }

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('User not found');

      // For Paddle, we usually create a transaction and pass the transactionId to the frontend
      // Or we can just return the priceId if we use Paddle Overlay with price ID directly.
      // However, creating a transaction allows us to associate it with a customer and custom data.

      let customerId = user.paddleCustomerId;

      if (!customerId) {
        // Create Paddle customer
        const customer = await this.paddle.customers.create({
          email: user.email,
          name: user.username || user.email,
          customData: { userId },
        });
        customerId = customer.id;
        await this.prisma.user.update({
          where: { id: userId },
          data: { paddleCustomerId: customerId },
        });
      }

      // Create a transaction for the checkout
      const transaction = await this.paddle.transactions.create({
        customerId: customerId,
        items: [
          {
            priceId: priceId,
            quantity: 1,
          },
        ],
        customData: {
          userId,
        },
      });

      return { transactionId: transaction.id };
    } catch (error: any) {
      this.logger.error(
        `Failed to create Paddle checkout session: ${error.message}`
      );
      throw new BadRequestException(
        `Paddle payment initialization failed: ${error.message}`
      );
    }
  }

  async getUserSubscription(userId: string): Promise<SubscriptionDetails> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        paddleSubscriptionId: true,
        paddleCustomerId: true,
      },
    });

    if (!user) throw new BadRequestException('User not found');

    let subscriptionDetails: Partial<SubscriptionDetails> = {};

    if (this.paddle && user.paddleSubscriptionId) {
      try {
        const subscription = await this.paddle.subscriptions.get(
          user.paddleSubscriptionId
        );
        subscriptionDetails = {
          status: this.mapSubscriptionStatus(subscription.status),
          cancelAtPeriodEnd: subscription.scheduledChange?.action === 'cancel',
          currentPeriodEnd: subscription.currentBillingPeriod?.endsAt
            ? new Date(subscription.currentBillingPeriod.endsAt)
            : undefined,
        };
      } catch (error) {
        this.logger.error(`Failed to fetch subscription from Paddle: ${error}`);
      }
    }

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      ...subscriptionDetails,
    };
  }

  async cancelSubscription(userId: string) {
    if (!this.paddle) {
      throw new BadRequestException('Paddle is not configured');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.paddleSubscriptionId) {
      throw new BadRequestException('No active Paddle subscription found');
    }

    try {
      await this.paddle.subscriptions.cancel(user.paddleSubscriptionId, {
        effectiveFrom: 'next_billing_period',
      });
      return {
        message:
          'Subscription will be canceled at the end of the billing period',
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel Paddle subscription: ${error.message}`
      );
      throw new BadRequestException(`Cancellation failed: ${error.message}`);
    }
  }

  async getBillingHistory(userId: string): Promise<BillingRecord[]> {
    if (!this.paddle) return [];

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.paddleCustomerId) return [];

    try {
      // Paddle API for transactions/invoices
      const transactions = this.paddle.transactions.list({
        customerId: [user.paddleCustomerId],
        status: ['billed', 'paid', 'completed'],
        perPage: 10,
      });

      const records: BillingRecord[] = [];
      for await (const txn of transactions) {
        records.push({
          id: txn.id,
          amount: parseInt(txn.details?.totals?.total || '0'), // Paddle returns string amount usually, need to check SDK
          currency: txn.currencyCode,
          status: this.mapBillingStatus(txn.status),
          date: new Date(txn.createdAt),
          pdfUrl: '', // Paddle might provide invoice URL in details
        });
      }
      return records;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch Paddle billing history: ${error.message}`
      );
      return [];
    }
  }

  async handleWebhook(signature: string, payload: any) {
    if (!this.paddle) {
      this.logger.error('Paddle is not configured');
      throw new BadRequestException('Paddle is not configured');
    }

    const webhookSecret = this.configService.get('PADDLE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Paddle webhook secret is not configured');
    }

    // Paddle SDK handles signature verification if we use the helper
    // But here we might need to parse the event manually or use SDK's unmarshal
    // The payload passed here might be raw body or parsed JSON depending on controller.
    // Assuming payload is the raw body string or buffer for signature verification.

    try {
      // Note: Paddle SDK 'unmarshal' expects the request body as string and the signature from header
      // payload should be the raw body string.
      const event = await this.paddle.webhooks.unmarshal(
        payload,
        webhookSecret,
        signature
      );

      this.logger.log(`Processing Paddle webhook event: ${event?.eventType}`);

      switch (event.eventType) {
        case EventName.SubscriptionCreated:
        case EventName.SubscriptionUpdated:
          await this.handleSubscriptionUpdated(event?.data);
          break;
        case EventName.SubscriptionCanceled:
          await this.handleSubscriptionCanceled(event?.data);
          break;
        case EventName.TransactionCompleted:
          await this.handleTransactionCompleted(event?.data);
          break;
        default:
          this.logger.log(`Unhandled Paddle event type: ${event.eventType}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Paddle Webhook signature verification failed: ${err.message}`
      );
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }

  private async handleTransactionCompleted(transaction: any) {
    const userId = transaction.customData?.userId;
    if (!userId) return;

    // If it's a subscription transaction, we might handle it in subscription events
    // But for one-time or initial subscription payment, we can record it.
    this.logger.log(`Paddle Transaction completed for user ${userId}`);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const customerId = subscription.customerId;
    const user = await this.prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
    });

    if (!user) return;

    const status = subscription.status;
    const expiresAt = new Date(subscription.currentBillingPeriod.endsAt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionExpiresAt: expiresAt,
        paddleSubscriptionId: subscription.id,
        subscriptionProvider: 'paddle',
        subscriptionTier: SubscriptionTier.PRO, // Simplified logic
      },
    });

    this.logger.log(
      `Updated Paddle subscription for user ${user.id}, status: ${status}`
    );
  }

  private async handleSubscriptionCanceled(subscription: any) {
    const customerId = subscription.customerId;
    const user = await this.prisma.user.findFirst({
      where: { paddleCustomerId: customerId },
    });

    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: SubscriptionTier.FREE,
        subscriptionExpiresAt: null,
        paddleSubscriptionId: null,
        subscriptionProvider: null,
      },
    });

    this.logger.log(`Paddle Subscription canceled for user ${user.id}`);
  }

  private mapSubscriptionStatus(status: string): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      deleted: SubscriptionStatus.CANCELED,
      trialing: SubscriptionStatus.TRIALING,
      paused: SubscriptionStatus.ACTIVE, // Or map to a PAUSED status if added
    };
    return mapping[status] || SubscriptionStatus.ACTIVE;
  }

  private mapBillingStatus(status: string): BillingStatus {
    const mapping: Record<string, BillingStatus> = {
      paid: BillingStatus.PAID,
      completed: BillingStatus.PAID,
      billed: BillingStatus.OPEN,
      draft: BillingStatus.DRAFT,
      canceled: BillingStatus.VOID,
    };
    return mapping[status] || BillingStatus.OPEN;
  }
}
