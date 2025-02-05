import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { PrintBoardPreview } from './PrintBoardPreview';

interface OptimizedCheckoutProps {
  printSize: PrintSize;
  layout: Layout;
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function OptimizedCheckout({ printSize, layout, onSuccess, onError }: OptimizedCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>();

  const initializePayment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printSize, layout })
      });
      
      const { clientSecret, orderId } = await response.json();
      setClientSecret(clientSecret);
      return orderId;
    } catch (error) {
      onError('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
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
          layout={layout}
          printSize={printSize}
          spacing={spacing}
        />
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <AddressElement options={{ mode: 'shipping' }} />
          <PaymentElement options={{
            paymentMethodOrder: ['apple_pay', 'card'],
            layout: 'tabs'
          }} />
          <button 
            onClick={() => handleSubmit()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Complete Purchase
          </button>
        </div>
      </div>
    </Elements>
  );
} 