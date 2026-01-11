/**
 * Payment related types
 */

/**
 * Status of a subscription
 * Matches Stripe subscription status but in uppercase
 */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  TRIALING = 'TRIALING',
  UNPAID = 'UNPAID',
}

/**
 * Status of a billing record (invoice)
 */
export enum BillingStatus {
  PAID = 'PAID',
  OPEN = 'OPEN',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
  DRAFT = 'DRAFT',
}
