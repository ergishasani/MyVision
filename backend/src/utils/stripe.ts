import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

// Define subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    currency: 'eur',
    interval: 'month',
    features: [
      'Up to 50 documents per month',
      'Basic PDF generation',
      'Email sending',
      'Client management',
    ],
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 79,
    currency: 'eur',
    interval: 'month',
    features: [
      'Unlimited documents',
      'Advanced PDF generation',
      'Email sending',
      'Client management',
      'SVG rendering',
      'Priority support',
    ],
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    currency: 'eur',
    interval: 'month',
    features: [
      'Unlimited documents',
      'Advanced PDF generation',
      'Email sending',
      'Client management',
      'SVG rendering',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
  },
];

export const TRIAL_DAYS = 14;

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(email: string, name?: string): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email,
    name,
  });
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
    },
  });
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
