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

// Maximum number of images supported by any layout
const MAX_IMAGES = 12;

interface ScrapedImage {
  url: string;
  alt: string;
}

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spacing, setSpacing] = useState(0.1);
  const [selectedSize, setSelectedSize] = useState<PrintSize>(PRINT_SIZES[0]);
  const [gapSpacing, setGapSpacing] = useState(16);
  const [currentStep, setCurrentStep] = useState(1);
  const [containMode, setContainMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (submittedUrl: string): Promise<void> => {
    setLoading(true);
    setError('');
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
    <main className="container mx-auto px-4 py-8 max-w-6xl min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-8 mb-12 max-w-3xl">
        <div className="w-20 h-20 mx-auto">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-blue-500"
          >
            <path
              d="M21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M7 14.5L9.5 17L17 9.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            from
          <span className="text-blue-600"> Pins </span>
            to
            <span className="text-blue-600"> Prints</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Whether it's your mood board, recipe collection, or creative inspiration – 
            bring your pins to life with beautiful, high-quality prints.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm">
          <p className="text-lg text-blue-800 font-medium">
            ✨ Simply paste your Pinterest board URL and select your favorites.
          </p>
        </div>
      </div>

      <div className="w-full max-w-xl">
        <URLInput 
          url={url}
          setUrl={setUrl}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>

      {scrapedImages.length > 0 && (
        <>
          <div className="relative group">
            <button 
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft -= 200;
                }
              }}
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>

            <div 
              ref={scrollRef}
              className="overflow-x-auto cursor-grab active:cursor-grabbing no-scrollbar"
              onMouseDown={handleDragStart}
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex gap-3 px-4 py-4 min-w-max">
                {scrapedImages.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    className={`
                      relative cursor-pointer rounded-lg overflow-hidden select-none
                      ${selectedIndices.includes(index) ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200'}
                    `}
                    onClick={() => toggleImageSelection(index)}
                  >
                    <div 
                      className="w-32 relative"
                      style={{ 
                        height: 'fit-content',
                        lineHeight: 0 // Remove any extra space
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.alt || ''}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                        draggable="false"
                      />
                    </div>
                    {selectedIndices.includes(index) && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center">
                        <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                          {selectedIndices.indexOf(index) + 1}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button 
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft += 200;
                }
              }}
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          {selectedIndices.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 bg-gray-50 p-4 rounded-lg">
                <PrintSizeSelector
                  selectedSize={selectedSize}
                  onSizeChange={setSelectedSize}
                />
                <div className="flex items-center gap-6">
                  <GapControl
                    value={spacing}
                    onChange={setSpacing}
                    label="Image spacing"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={containMode}
                      onChange={(e) => setContainMode(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show full images</span>
                  </label>
                </div>
              </div>

              <UnifiedCheckout
                layout={calculateLayout()!}
                printSize={selectedSize}
                spacing={spacing}
                containMode={containMode}
                onSuccess={(orderId) => router.push(`/orders/${orderId}/success`)}
                onError={setError}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
