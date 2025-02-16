"use client";
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { PrintSize } from '@/app/types/order';
import { Loader2 } from 'lucide-react';

interface LayoutData {
  name: string;
  template: number[][];
  images: {
    url: string;
    position: { x: number; y: number; w: number; h: number };
    rotation: number;
  }[];
}

interface CheckoutButtonProps {
  layoutData: LayoutData;
  printSize: PrintSize | null;
  disabled?: boolean;
}

const _stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const CheckoutButton: React.FC<CheckoutButtonProps> = ({ 
  layoutData, 
  printSize, 
  disabled 
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prints/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutData)
      });

      const { sessionUrl } = await response.json();
      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed transition-all"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </span>
      ) : (
        `Checkout - $${printSize?.price}`
      )}
    </button>
  );
};