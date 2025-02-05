'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import type { PrintSize } from '@/app/types/order';

interface CheckoutFlowProps {
  layout: {
    images: Array<{
      url: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }>;
  };
  printSize: PrintSize;
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
}

export const CheckoutFlow = ({
  layout,
  printSize,
  onSuccess,
  onError
}: CheckoutFlowProps) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('Starting checkout...');
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          printSize
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();
      const { sessionId, orderId } = data;
      
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load payment processor');
      
      await stripe.redirectToCheckout({ sessionId });
      onSuccess(orderId);
    } catch (error) {
      console.error('Checkout error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </span>
      ) : (
        `Checkout - $${printSize.price}`
      )}
    </button>
  );
}; 