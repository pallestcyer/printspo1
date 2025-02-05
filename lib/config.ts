import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Invalid environment variables');
  }
}

const env = validateEnv();

export const config = {
  baseUrl: env.NEXT_PUBLIC_BASE_URL,
  stripe: {
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  email: {
    resendKey: env.RESEND_API_KEY,
  },
} as const; 