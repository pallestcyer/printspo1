import React, { useState, useRef } from 'react';
import { Replace } from 'lucide-react';
import { ImageReplaceModal } from './ImageReplaceModal';
import type { ScrapedImage } from '@/app/types';
import type { PrintSize } from '@/app/types/order';
import { loadStripe } from '@stripe/stripe-js';

interface PhotoLayoutGridProps {
  scrapedImages: ScrapedImage[];
  selectedIndices: number[];
  onSelectionChange: (newIndices: number[]) => void;
  selectedSize: PrintSize;
  onCheckout: () => void;
  gapSpacing?: number;
  onGapChange?: (value: number) => void;
}

export default function PhotoLayoutGrid({
  scrapedImages,
  selectedIndices,
  onSelectionChange,
  selectedSize,
  onCheckout,
  gapSpacing = 16,
  onGapChange
}: PhotoLayoutGridProps) {
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getGridDimensions = () => {
    const imageCount = selectedIndices.length;
    if (imageCount === 1) return { cols: 1, rows: 1 };
    if (imageCount === 2) return { cols: 2, rows: 1 };
    if (imageCount === 3) return { cols: 3, rows: 1 };
    if (imageCount === 4) return { cols: 2, rows: 2 };
    if (imageCount <= 6) return { cols: 3, rows: 2 };
    return { cols: 3, rows: Math.ceil(imageCount / 3) };
  };

  const { cols, rows } = getGridDimensions();

  // Calculate individual image dimensions
  const imageWidth = 100 / cols;
  const imageHeight = (100 / rows) / (selectedSize.width / selectedSize.height);

  const handleImageReplace = (index: number) => {
    setSelectedImageIndex(index);
    setReplaceModalOpen(true);
  };

  const handleImageSelect = (newImageUrl: string) => {
    if (selectedImageIndex !== null) {
      // Find the index of the new image in scrapedImages
      const newImageIndex = scrapedImages.findIndex(img => img.url === newImageUrl);
      
      if (newImageIndex !== -1) {
        // Create a new array with the replaced image
        const newIndices = [...selectedIndices];
        newIndices[selectedImageIndex] = newImageIndex;
        onSelectionChange(newIndices);
      }
    }
    setReplaceModalOpen(false);
    setSelectedImageIndex(null);
  };

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedIndices.map(index => ({
            url: scrapedImages[index].url,
            alt: scrapedImages[index].alt
          })),
          printSize: selectedSize
        })
      });

      const { sessionId } = await response.json();
      
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('Failed to load Stripe');
      
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
      // Handle error (show error message to user)
    }
  };

  // Add this function to maintain aspect ratio
  const calculateImageStyles = (image: ScrapedImage, containerWidth: number, containerHeight: number) => {
    const img = new Image();
    img.src = image.url;
    
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = containerWidth / containerHeight;
    
    if (aspectRatio > containerRatio) {
      // Image is wider than container
      return {
        width: '100%',
        height: 'auto',
        objectFit: 'cover' as const,
        objectPosition: 'center'
      };
    } else {
      // Image is taller than container
      return {
        width: 'auto',
        height: '100%',
        objectFit: 'cover' as const,
        objectPosition: 'center'
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Container */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Gap Spacing: {gapSpacing}px
          </div>
          <input
            type="range"
            min="4"
            max="32"
            value={gapSpacing}
            onChange={(e) => onGapChange?.(Number(e.target.value))}
            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Print Preview Container */}
      <div 
        ref={containerRef}
        className="relative bg-white shadow-xl rounded-sm overflow-hidden"
        style={{
          aspectRatio: `${selectedSize.width}/${selectedSize.height}`,
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px',
          backgroundColor: '#fafafa'
        }}
      >
        {/* Inner print border */}
        <div 
          className="absolute inset-4 border border-gray-200"
          style={{
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03)'
          }}
        />
        
        {/* Grid Container */}
        <div 
          className="relative h-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: `${gapSpacing}px`,
            padding: '32px'
          }}
        >
          {selectedIndices.map((imageIndex, index) => {
            const image = scrapedImages[imageIndex];
            return (
              <div 
                key={`${image.url}-${index}`} 
                className="relative group"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s ease-in-out',
                  height: '100%',
                  minHeight: '150px'
                }}
              >
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
                <button
                  onClick={() => handleImageReplace(index)}
                  className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-50"
                  title="Replace image"
                >
                  <Replace className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print Size Info */}
      <div className="text-center text-sm text-gray-600">
        Print Size: {selectedSize.width}" × {selectedSize.height}"
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
      >
        Checkout - ${selectedSize.price.toFixed(2)}
      </button>

      <ImageReplaceModal
        isOpen={replaceModalOpen}
        onClose={() => {
          setReplaceModalOpen(false);
          setSelectedImageIndex(null);
        }}
        onImageSelect={handleImageSelect}
        currentImageUrl={selectedImageIndex !== null ? scrapedImages[selectedIndices[selectedImageIndex]]?.url : ''}
        availableImages={scrapedImages}
      />
    </div>
  );
}
