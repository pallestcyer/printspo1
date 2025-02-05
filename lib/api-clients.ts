import Stripe from 'stripe';
import { Resend } from 'resend';
import { config } from './config';

export const stripe = new Stripe(config.stripe.secretKey!, {
  apiVersion: '2025-01-27.acacia'
});

export const resend = new Resend(config.email.resendKey);

// Add print service client when needed 