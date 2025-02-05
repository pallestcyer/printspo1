"use client";
import React, { useState, useRef } from 'react';
import { AlertCircle, Loader2, CheckCircle2, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { PrintSizeSelector } from '@/components/PrintSizeSelector';
import { CheckoutButton } from '@/components/CheckoutButton';
import { PRINT_SIZES } from '@/lib/constants';
import { GapControl } from '@/components/GapControl';
import type { PrintSize } from '@/app/types/order';
import { theme } from '@/components/ui/theme';
import { StepIndicator } from '@/components/StepIndicator';
import { URLInput } from '@/components/URLInput';
import { ImageSelectionSection } from '@/components/ImageSelectionSection';
import { loadStripe } from '@stripe/stripe-js';
import { Step, StepStatus } from '@/app/types/step';
import { getPrintSizeVariantId } from '@/lib/stripe-helpers';
import { OptimizedCheckout } from '@/components/OptimizedCheckout';
import { useRouter } from 'next/navigation';
import { UnifiedCheckout } from '@/components/UnifiedCheckout';
import { PrintBoardPreview } from '@/components/PrintBoardPreview';
import type { ScrapedImage } from '@/app/types/index';

// Maximum number of images supported by any layout
const MAX_IMAGES = 12;

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spacing, setSpacing] = useState(0.1);
  const [selectedSize, setSelectedSize] = useState<PrintSize | null>(null);
  const [gapSpacing, setGapSpacing] = useState(16);
  const [currentStep, setCurrentStep] = useState(1);
  const [containMode, setContainMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (submittedUrl: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setScrapedImages([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: submittedUrl }),
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
        url: submittedUrl,
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
    if (!selectedIndices.length || !scrapedImages.length) return null;
    
    return {
      images: selectedIndices.map(index => ({
        url: scrapedImages[index].url,
        alt: scrapedImages[index].alt,
        position: { x: 0, y: 0, w: 1, h: 1 },
        rotation: 0
      }))
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

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current!.scrollLeft = scrollLeft - walk;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current!.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* URL Input Section */}
      <section className="w-full max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4">
          <URLInput 
            url={url}
            setUrl={setUrl}
            onSubmit={handleSubmit} 
            loading={loading} 
          />
        </div>
      </section>

      {/* Image Selection Section */}
      {scrapedImages.length > 0 && (
        <section className="w-full py-8">
          <ImageSelectionSection
            images={scrapedImages}
            selectedIndices={selectedIndices}
            onSelect={toggleImageSelection}
          />
        </section>
      )}

      {/* Print Options Section */}
      {selectedIndices.length > 0 && (
        <section className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <PrintSizeSelector
                sizes={PRINT_SIZES}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
              />
            </div>
            <div className="w-full sm:w-auto">
              <CheckoutButton
                layoutData={{
                  name: 'Custom Layout',
                  template: [[1]],
                  images: selectedIndices.map(index => ({
                    url: scrapedImages[index].url,
                    alt: scrapedImages[index].alt,
                    position: { x: 0, y: 0, w: 1, h: 1 },
                    rotation: 0
                  }))
                }}
                printSize={selectedSize}
                disabled={selectedIndices.length === 0 || !selectedSize}
              />
            </div>
          </div>
        </section>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </main>
  );
}
