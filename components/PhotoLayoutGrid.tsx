import React, { useState, useRef } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (gridRef.current?.offsetLeft || 0));
    setScrollLeft(gridRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (gridRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (gridRef.current) {
      gridRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  // Filter out images that are already in the print board
  const availableImages = scrapedImages.filter((_, index) => !selectedIndices.includes(index));

  return (
    <div className="space-y-6">
      <div className="relative">
        <div
          ref={gridRef}
          className="grid gap-4 cursor-grab active:cursor-grabbing"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: `${gapSpacing}px`,
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'auto',
            padding: '1rem',
            userSelect: 'none'
          }}
        >
          {availableImages.map((image, i) => {
            const originalIndex = scrapedImages.findIndex(img => img.url === image.url);
            
            return (
              <div
                key={`${image.url}-${originalIndex}`}
                className="relative group cursor-pointer"
                onClick={() => {
                  if (!isDragging) {
                    onSelectionChange([...selectedIndices, originalIndex]);
                  }
                }}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden shadow-md">
                  <img
                    src={image.url}
                    alt={image.alt || ''}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
                  
                  {/* Border highlight on hover */}
                  <div 
                    className="absolute inset-0 ring-2 ring-blue-500 ring-opacity-0 group-hover:ring-opacity-50 transition-all duration-200"
                  />
                </div>
              </div>
            );
          })}
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
