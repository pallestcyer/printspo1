import React, { useState } from 'react';
import { Replace } from 'lucide-react';
import { ImageReplaceModal } from './ImageReplaceModal';
import type { ScrapedImage } from '@/app/types/index';
import type { PrintSize } from '@/app/types/order';

interface PhotoLayoutGridProps {
  scrapedImages: ScrapedImage[];
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
  selectedSize: PrintSize;
  onCheckout: () => Promise<void>;
  gapSpacing: number;
  onGapChange: (spacing: number) => void;
  spacing?: number;
  setSpacing?: (spacing: number) => void;
  onLayoutComplete?: () => void;
}

export default function PhotoLayoutGrid({
  scrapedImages,
  selectedIndices,
  onSelectionChange,
  selectedSize,
  onCheckout,
  gapSpacing = 16,
  onGapChange,
  onLayoutComplete
}: PhotoLayoutGridProps) {
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const handleImageReplace = (index: number) => {
    setSelectedImageIndex(index);
    setReplaceModalOpen(true);
  };

  const handleImageSelect = (newImageIndex: number) => {
    if (selectedImageIndex !== null) {
      const newIndices = [...selectedIndices];
      newIndices[selectedImageIndex] = newImageIndex;
      onSelectionChange(newIndices);
      setReplaceModalOpen(false);
      setSelectedImageIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: `${gapSpacing}px`,
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '1rem'
          }}
        >
          {scrapedImages.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className={`
                relative group cursor-pointer
                ${selectedIndices.includes(index) ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => {
                const newIndices = selectedIndices.includes(index)
                  ? selectedIndices.filter(i => i !== index)
                  : [...selectedIndices, index];
                onSelectionChange(newIndices);
              }}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <img
                src={image.url}
                alt={image.alt || ''}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-gray-600">
        Print Size: {selectedSize.width}" × {selectedSize.height}"
      </div>

      <button
        onClick={onCheckout}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
      >
        Checkout - ${selectedSize.price.toFixed(2)}
      </button>

      {replaceModalOpen && (
        <ImageReplaceModal
          scrapedImages={scrapedImages}
          onSelect={handleImageSelect}
          onClose={() => setReplaceModalOpen(false)}
          selectedIndices={selectedIndices}
        />
      )}
    </div>
  );
}
