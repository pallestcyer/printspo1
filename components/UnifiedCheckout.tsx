import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { PrintBoardPreview } from './PrintBoardPreview';
import { Loader2, CheckCircle2, Download } from 'lucide-react';
import type { PrintSize } from '@/app/types/order';

interface UnifiedCheckoutProps {
  layout: {
    images: {
      url: string;
      alt?: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }[];
  };
  printSize: PrintSize;
  spacing: number;
  containMode: boolean;
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
}

export function UnifiedCheckout({ 
  layout, 
  printSize, 
  spacing, 
  containMode,
  onSuccess, 
  onError 
}: UnifiedCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [printFile, setPrintFile] = useState<string | null>(null);

  const generatePrintFile = async (isPreview = false) => {
    try {
      setLoading(true);
      const response = await fetch('/api/prints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: layout.images,
          printSize,
          spacing,
          containMode,
          isPreview
        })
      });

      if (!response.ok) throw new Error('Failed to generate print file');
      const data = await response.json();
      
      if (isPreview) {
        setPreviewUrl(data.preview);
      } else {
        setPrintFile(data.images[0].printUrl);
      }
      return data;
    } catch (error) {
      onError('Failed to generate print file');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      // Generate high-res print file first
      const printData = await generatePrintFile(false);
      if (!printData) return;

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          printSize,
          spacing,
          printFile: printData.images[0].printUrl
        })
      });

      if (!response.ok) throw new Error('Failed to create order');
      const { sessionId, orderId } = await response.json();
      
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
    <div className="space-y-6">
      <PrintBoardPreview 
        layout={layout}
        printSize={printSize}
        spacing={spacing}
        containMode={containMode}
      />
      
      <div className="flex gap-4">
        <button
          onClick={() => generatePrintFile(true)}
          className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Preview Print
        </button>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
        >
          <div className="flex items-center justify-center gap-3">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Complete Order - ${printSize.price.toFixed(2)}</span>
              </>
            )}
          </div>
        </button>
      </div>

      {previewUrl && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Preview generated! Click to download:</p>
          <a 
            href={previewUrl}
            download
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Preview
          </a>
        </div>
      )}
    </div>
  );
} 