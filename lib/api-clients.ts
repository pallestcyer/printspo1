import Stripe from 'stripe';
import { Resend } from 'resend';
import { config } from './config';

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

// Initialize Resend
export const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Cloudinary (if needed)
export const cloudinary = {
  // Add cloudinary config here if needed
};

// Add print service client when needed 