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

export function CheckoutFlow({
  layout,
  printSize,
  onSuccess,
  onError
}: CheckoutFlowProps): JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout, printSize })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const { sessionId, orderId } = await response.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (!stripe) {
        throw new Error('Failed to load payment processor');
      }

      const { error: checkoutError } = await stripe.redirectToCheckout({ sessionId });
      if (checkoutError) {
        throw checkoutError;
      }

      onSuccess(orderId);
    } catch (_error) {
      onError(_error instanceof Error ? _error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Checkout'}
    </button>
  );
} 