import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';

interface CheckoutFlowProps {
  layout: any;
  printSize: any;
  onSuccess: () => void;
  onError: (error: string) => void;
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
      console.log('Starting checkout...');
      const layout = {
        images: selectedIndices.map(index => ({
          url: scrapedImages[index].url,
          alt: scrapedImages[index].alt,
          position: { x: 0, y: 0, w: 1, h: 1 },
          rotation: 0
        }))
      };
      
      console.log('Layout prepared:', layout);
      console.log('Selected size:', selectedSize);
  
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          printSize: selectedSize,
          spacing
        })
      });
  
      console.log('Order API response:', response.status);
      const data = await response.json();
      console.log('Order data:', data);
  
      const { sessionId, orderId } = data;
      
      console.log('Loading Stripe...');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load payment processor');
      
      console.log('Redirecting to checkout...');
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to process checkout');
    }
  };

      console.log('Order preparation API response:', orderResponse.status);
      const { sessionUrl } = await orderResponse.json();
      
      console.log('Loading Stripe...');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);
      if (!stripe) throw new Error('Failed to load payment processor');
      
      console.log('Redirecting to checkout...');
      await stripe.redirectToCheckout({
        sessionId: sessionUrl
      });

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Checkout - $${printSize.price.toFixed(2)}`
      )}
    </button>
  );
}; 