import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  createStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  SUBSCRIPTION_PLANS,
  TRIAL_DAYS,
} from '../utils/stripe';
import { NotFoundError } from '../utils/errors';

const router = express.Router();

// Get available subscription plans
router.get('/plans', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        plans: SUBSCRIPTION_PLANS,
        trialDays: TRIAL_DAYS,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Get current user's subscription
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;

    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          subscription: null,
          isTrial: true,
          trialEndsAt: null,
        },
      });
    }

    // Calculate trial end date
    const trialEndsAt = subscription.trialEndsAt;
    const isTrial = subscription.status === 'TRIAL' && 
                   trialEndsAt && 
                   new Date(trialEndsAt) > new Date();

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: subscription.plan,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt: subscription.trialEndsAt,
        },
        isTrial,
        trialEndsAt,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Create checkout session
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID',
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId },
    });

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      const customer = await createStripeCustomer(
        user.email,
        user.companyName || `${user.firstName} ${user.lastName}`.trim() || undefined
      );
      stripeCustomerId = customer.id;

      // Create or update subscription record
      if (existingSubscription) {
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: { stripeCustomerId },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId,
            status: 'TRIAL',
            plan: plan.id.toUpperCase() as any,
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await createCheckoutSession(
      stripeCustomerId,
      plan.stripePriceId,
      `${frontendUrl}/settings?success=true`,
      `${frontendUrl}/settings?canceled=true`
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Create billing portal session
router.post('/billing-portal', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.userId!;

    const subscription = await prisma.subscription.findFirst({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await createBillingPortalSession(
      subscription.stripeCustomerId,
      `${frontendUrl}/settings`
    );

    res.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const stripe = (await import('../utils/stripe')).stripe;
    
    const sig = (req as any).headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(400).send('Webhook secret not configured');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent((req as any).body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer;
        
        // Find subscription by customer ID
        const subscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (subscription) {
          // Get subscription details from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
          
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              stripeSubscriptionId: stripeSubscription.id,
              status: stripeSubscription.status === 'active' ? 'ACTIVE' : 'TRIAL',
              plan: subscription.plan, // Keep existing plan or update based on price
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              trialEndsAt: stripeSubscription.trial_end 
                ? new Date(stripeSubscription.trial_end * 1000)
                : null,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as any;
        
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (subscription) {
          let status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'UNPAID' | 'TRIAL' = 'ACTIVE';
          
          if (stripeSubscription.status === 'canceled' || stripeSubscription.status === 'unpaid') {
            status = stripeSubscription.status === 'canceled' ? 'CANCELLED' : 'UNPAID';
          } else if (stripeSubscription.status === 'past_due') {
            status = 'PAST_DUE';
          } else if (stripeSubscription.status === 'trialing') {
            status = 'TRIAL';
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status,
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
