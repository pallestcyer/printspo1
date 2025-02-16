'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements,
  AddressElement 
} from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { PrintBoardPreview } from './PrintBoardPreview';
import type { PrintSize } from '@/app/types';

interface OptimizedCheckoutProps {
  printSize: PrintSize;
  layout: {
    images: Array<{
      url: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }>;
  };
  onSuccess: (orderId: string) => void;
  onError: (message: string) => void;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function OptimizedCheckout({ 
  printSize, 
  layout, 
  onSuccess, 
  onError 
}: OptimizedCheckoutProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [_previewUrl, _setPreviewUrl] = useState<string | null>(null);
  const [_printFile, _setPrintFile] = useState<string | null>(null);
  const [spacing] = useState<number>(0);
  const [clientSecret, setClientSecret] = useState<string>();
  const stripe = useStripe();
  const elements = useElements();

  const initializePayment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printSize, layout })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const { clientSecret, orderId } = await response.json();
      setClientSecret(clientSecret);
      return orderId;
    } catch (_error) {
      onError('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        const response = await fetch(`/api/orders/${paymentIntent.id}`);
        const { orderId } = await response.json();
        if (orderId) {
          onSuccess(orderId);
        } else {
          onError('Order ID not found');
        }
      } else {
        onError('Payment status unclear. Please check your order status.');
      }
    } catch (_error) {
      console.error('Checkout error:', _error);
      onError(_error instanceof Error ? _error.message : 'Failed to process checkout');
    } finally {
      setLoading(false);
    }
  };

  if (!stripe) {
    return (
      <button 
        onClick={initializePayment}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Preparing Checkout...
          </span>
        ) : (
          `Checkout - $${printSize.price}`
        )}
      </button>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <div className="space-y-6">
        <PrintBoardPreview
          layout={{
            ...layout,
            size: {
              width: printSize.width,
              height: printSize.height
            }
          }}
          printSize={printSize}
          spacing={spacing}
          containMode={true}
          isPortrait={printSize.height > printSize.width}
          cornerRounding={0}
          onRemoveImage={() => {}}
          onImageSwap={() => {}}
          _index={0}
          images={layout.images}
        />
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <AddressElement options={{ mode: 'shipping' }} />
          <PaymentElement options={{
            paymentMethodOrder: ['apple_pay', 'card'],
            layout: 'tabs'
          }} />
          <button 
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Complete Purchase
          </button>
        </div>
      </div>
    </Elements>
  );
} 