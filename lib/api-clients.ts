import Stripe from 'stripe';
import { Resend } from 'resend';
import { config } from './config';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const resend = new Resend(config.email.resendKey);

// Add print service client when needed 