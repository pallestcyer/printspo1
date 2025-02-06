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
import Image from 'next/image';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { LayoutCustomizationSection } from '@/components/LayoutCustomizationSection';

// Maximum number of images supported by any layout
const MAX_IMAGES = 12;

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spacing, setSpacing] = useState(0.5);
  const [selectedSize, setSelectedSize] = useState<PrintSize>(PRINT_SIZES[0]);
  const [gapSpacing, setGapSpacing] = useState(16);
  const [currentStep, setCurrentStep] = useState(1);
  const [containMode, setContainMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [isPortrait, setIsPortrait] = useState(true);

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

  const handlePreviewDownload = async () => {
    try {
      const response = await fetch('/api/prints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedIndices.map(index => ({
            url: scrapedImages[index].url,
            alt: scrapedImages[index].alt,
            position: { x: 0, y: 0, w: 1, h: 1 },
            rotation: 0
          })),
          printSize: selectedSize,
          spacing,
          containMode,
          isPreview: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      window.open(data.images[0].previewUrl, '_blank');
    } catch (error) {
      console.error('Preview generation error:', error);
      setError('Failed to generate preview');
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

  const handleDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === index) return;

    const newIndices = [...selectedIndices];
    const [removed] = newIndices.splice(draggedImageIndex, 1);
    newIndices.splice(index, 0, removed);
    
    setSelectedIndices(newIndices);
    setDraggedImageIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
  };

  const removeImage = (index: number) => {
    setSelectedIndices(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckoutSuccess = (orderId: string) => {
    console.log('Order created:', orderId);
  };

  const handleCheckoutError = (message: string) => {
    setError(message);
  };

  const calculateGridLayout = () => {
    const count = selectedIndices.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2 grid-rows-2';
    if (count === 5 || count === 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3';
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center space-y-8 mb-12 max-w-3xl mx-auto">
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
              From Pins to Prints – Instantly
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Turn Pinterest boards into high-quality prints for mood boards, presentations, and inspiration walls.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm">
            <p className="text-lg text-blue-800 font-medium">
              ✨ Link your Pinterest board, select your vibe, and send to print.
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl mx-auto mb-8">
          <URLInput 
            url={url}
            setUrl={setUrl}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>

        {scrapedImages.length > 0 && (
          <div className="container mx-auto px-2 sm:px-4 max-w-4xl pb-12 sm:pb-24">
            <div className="flex flex-col gap-6 sm:gap-8">
              <section className="w-full space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-center">Select Images</h2>
                <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 mx-auto max-w-3xl">
                  <ImageSelectionSection
                    images={scrapedImages}
                    selectedIndices={selectedIndices}
                    onSelect={toggleImageSelection}
                  />
                </div>
              </section>

              {selectedIndices.length > 0 && (
                <section className="w-full space-y-4">
                  <h2 className="text-xl font-semibold mb-4 text-center">Print Preview</h2>
                  <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 mx-auto max-w-3xl overflow-hidden">
                    <div className="relative">
                      <PrintBoardPreview
                        layout={{
                          images: selectedIndices.map((imageIndex) => ({
                            url: scrapedImages[imageIndex].url,
                            alt: scrapedImages[imageIndex].alt,
                            position: { x: 0, y: 0, w: 1, h: 1 },
                            rotation: 0
                          }))
                        }}
                        printSize={selectedSize}
                        spacing={spacing}
                        containMode={containMode}
                        isPortrait={isPortrait}
                        onRemoveImage={removeImage}
                      />
                      <div 
                        className={`grid h-full w-full absolute inset-0`}
                        style={{ 
                          gridTemplateColumns: isPortrait 
                            ? selectedIndices.length <= 2 ? 'repeat(1, 1fr)'
                            : selectedIndices.length <= 4 ? 'repeat(2, 1fr)'
                            : 'repeat(3, 1fr)'
                            : selectedIndices.length <= 2 ? 'repeat(2, 1fr)'
                            : selectedIndices.length <= 6 ? 'repeat(3, 1fr)'
                            : 'repeat(4, 1fr)',
                          gap: `${spacing}rem`,
                          padding: '1rem',
                          pointerEvents: 'none',
                          touchAction: 'none'
                        }}
                      >
                        {selectedIndices.map((_, index) => (
                          <div
                            key={index}
                            className="relative group"
                            style={{ pointerEvents: 'auto' }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                              handleDragStart(index);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              handleDragOver(e, index);
                            }}
                            onDragEnd={handleDragEnd}
                          >
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 z-20 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors cursor-move rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 max-w-3xl mx-auto overflow-hidden">
                    <div className="space-y-4 max-w-full">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1 flex items-center gap-2 min-w-[200px]">
                          <span className="text-sm text-gray-600 whitespace-nowrap">Spacing:</span>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={spacing}
                            onChange={(e) => setSpacing(parseFloat(e.target.value))}
                            className="flex-1 w-full"
                          />
                          <span className="text-sm text-gray-600 w-12">{spacing.toFixed(1)}rem</span>
                        </div>

                        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={containMode}
                              onChange={(e) => setContainMode(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Show full images</span>
                          </label>

                          <button
                            onClick={() => setIsPortrait(!isPortrait)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 whitespace-nowrap"
                            style={{
                              backgroundColor: isPortrait ? '#EBF5FF' : 'white',
                              borderColor: isPortrait ? '#3B82F6' : '#E5E7EB',
                              color: isPortrait ? '#1D4ED8' : '#374151'
                            }}
                          >
                            <svg 
                              viewBox="0 0 24 24" 
                              className="w-4 h-4"
                              fill="none" 
                              stroke="currentColor"
                            >
                              {isPortrait ? (
                                <rect x="8" y="4" width="8" height="16" rx="1" strokeWidth="2" />
                              ) : (
                                <rect x="4" y="8" width="16" height="8" rx="1" strokeWidth="2" />
                              )}
                            </svg>
                            {isPortrait ? 'Portrait' : 'Landscape'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 w-full">
                        {PRINT_SIZES.map((size) => (
                          <button
                            key={`${size.width}x${size.height}`}
                            onClick={() => setSelectedSize(size)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              selectedSize === size
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium">{size.width}" × {size.height}"</div>
                            <div className="text-sm text-gray-600">${size.price}</div>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-4 pt-4 border-t">
                        <button
                          onClick={handlePreviewDownload}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                        >
                          Preview Print
                        </button>

                        <button
                          onClick={handleCheckout}
                          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                        >
                          Checkout - ${selectedSize.price.toFixed(2)}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="fixed top-4 right-4 left-4 sm:left-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
