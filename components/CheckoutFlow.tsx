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

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // First generate the PDF
      const pdfResponse = await fetch('/api/prints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: layout.images,
          layout: layout.layout,
          printSize
        })
      });

      if (!pdfResponse.ok) throw new Error('Failed to generate print layout');
      const { pdf } = await pdfResponse.json();

      // Then create the order and get Stripe session
      const orderResponse = await fetch('/api/prints/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          print_size: printSize,
          images: layout.images,
          layout_id: layout.layout,
          pdf_data: pdf
        })
      });

      if (!orderResponse.ok) throw new Error('Failed to prepare order');
      
      const { sessionUrl } = await orderResponse.json();
      
      // Redirect to Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);
      if (!stripe) throw new Error('Failed to load payment processor');
      
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