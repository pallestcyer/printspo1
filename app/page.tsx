"use client";
import React, { useState } from 'react';
import { AlertCircle, Loader2, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import PhotoLayoutGrid from '@/components/PhotoLayoutGrid';
import { PrintSizeSelector } from '@/components/PrintSizeSelector';
import { CheckoutButton } from '@/components/CheckoutButton';
import { PRINT_SIZES } from '@/lib/constants';
import { GapControl } from '@/components/GapControl';
import type { PrintSize } from '@/app/types/order';
import { theme } from '@/components/ui/theme';
import { StepIndicator } from '@/components/StepIndicator';
import { URLInput } from '@/components/URLInput';
import { ImageSelectionSection } from '@/components/ImageSelectionSection';
import { LayoutCustomizationSection } from '@/components/LayoutCustomizationSection';
import { loadStripe } from '@stripe/stripe-js';
import { Step, StepStatus } from '@/app/types/step';
import { getPrintSizeVariantId } from '@/lib/stripe-helpers';

interface ScrapedImage {
  url: string;
  alt: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spacing, setSpacing] = useState(8);
  const [selectedSize, setSelectedSize] = useState<PrintSize>(PRINT_SIZES['8.5x11']);
  const [gapSpacing, setGapSpacing] = useState(16);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setScrapedImages([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pinterest responded with an error');
      }

      if (!data.images?.length) {
        throw new Error('Found images but none met quality requirements');
      }

      setScrapedImages(data.images);
      setSelectedIndices([0, 1, 2, 3]);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('Fetch error:', {
        error: error.message,
        url,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const calculateLayout = () => {
    if (!selectedIndices.length || !scrapedImages.length) {
      return null;
    }

    const validIndices = selectedIndices.filter(index => scrapedImages[index]);
    
    return {
      images: validIndices.map(index => ({
        url: scrapedImages[index].url,
        alt: scrapedImages[index].alt,
        position: { x: 0, y: 0, w: 1, h: 1 },
        rotation: 0
      }))
    };
  };

  const prepareLayoutForPrint = () => {
    const layout = calculateLayout();
    if (!layout) return null;

    return {
      layout,
      printSize: {
        name: selectedSize.name,
        width: selectedSize.width,
        height: selectedSize.height,
        price: selectedSize.price
      },
      spacing
    };
  };

  const handleLayoutComplete = () => {
    const layout = calculateLayout();
    if (!layout) return;
    console.log('Layout complete:', layout);
  };

  const handleCheckout = async (): Promise<void> => {
    try {
      const layout = {
        images: selectedIndices.map(index => ({
          url: scrapedImages[index].url,
          alt: scrapedImages[index].alt,
          position: { x: 0, y: 0, w: 1, h: 1 },
          rotation: 0
        }))
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout,
          printSize: selectedSize,
          spacing
        })
      });

      const { sessionId, orderId } = await response.json();
      
      // Redirect to Stripe checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load payment processor');
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to process checkout');
    }
  };

  const steps: Step[] = [
    {
      title: 'Import Images',
      description: 'Add Pinterest board URL',
      status: (!url ? 'current' : scrapedImages.length > 0 ? 'complete' : 'upcoming') as StepStatus
    },
    {
      title: 'Select Images',
      description: 'Choose photos for your layout',
      status: (!scrapedImages.length ? 'upcoming' : 
        selectedIndices.length > 0 ? 'complete' : 'current') as StepStatus
    },
    {
      title: 'Customize Layout',
      description: 'Arrange and adjust photos',
      status: (!selectedIndices.length ? 'upcoming' : 'current') as StepStatus
    }
  ];

  return (
    <main className={theme.spacing.container}>
      <StepIndicator steps={steps} />
      
      <div className={theme.spacing.stack}>
        {/* URL Input Section */}
        <section className={`${theme.components.card} ${theme.spacing.section}`}>
          <div className="px-6">
            <h2 className="text-2xl font-semibold mb-4">Import Your Pinterest Images</h2>
            <URLInput 
              url={url}
              setUrl={setUrl}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
            />
          </div>
        </section>

        {/* Image Selection Section - Reference existing code */}
        {scrapedImages.length > 0 && (
          <ImageSelectionSection 
            images={scrapedImages}
            selectedIndices={selectedIndices}
            onSelectionChange={setSelectedIndices}
          />
        )}

        {/* Layout Customization Section - Reference existing code */}
        {selectedIndices.length > 0 && (
          <LayoutCustomizationSection 
            selectedImages={selectedIndices.map(i => scrapedImages[i])}
            selectedSize={selectedSize}
            spacing={spacing}
            onSpacingChange={setSpacing}
            onSizeChange={setSelectedSize}
            onLayoutComplete={handleLayoutComplete}
            gapSpacing={gapSpacing}
            onGapChange={setGapSpacing}
            onCheckout={handleCheckout}
          />
        )}

        <div className="flex items-center space-x-4 mb-4">
          <PrintSizeSelector
            selectedSize={selectedSize}
            onSizeChange={setSelectedSize}
          />
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Gap Spacing
            </label>
            <input
              type="range"
              min="4"
              max="32"
              value={gapSpacing}
              onChange={(e) => setGapSpacing(Number(e.target.value))}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600">{gapSpacing}px</span>
          </div>
        </div>

        <PhotoLayoutGrid
          scrapedImages={scrapedImages}
          selectedIndices={selectedIndices}
          onSelectionChange={setSelectedIndices}
          selectedSize={selectedSize}
          onCheckout={handleCheckout}
          gapSpacing={gapSpacing}
          onGapChange={setGapSpacing}
        />
      </div>
    </main>
  );
}
