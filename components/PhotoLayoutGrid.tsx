import React, { useState, useRef } from 'react';
import { ImageReplaceModal } from './ImageReplaceModal';
import type { Layout, ScrapedImage } from '@/app/types';
import type { PrintSize } from '@/app/types/order';

interface PhotoLayoutGridProps {
  layout: Layout & {
    selectedIndices: number[];
    images: ScrapedImage[];
  };
  onLayoutChange: (layout: Layout) => void;
  _onGapChange: (spacing: number) => void;
  _onLayoutComplete: () => void;
  selectedSize: PrintSize;
  onCheckout: () => Promise<void>;
  gapSpacing: number;
  _spacing?: number;
  _setSpacing?: (spacing: number) => void;
  cornerRounding: number;
  onCornerRoundingChange: (rounding: number) => void;
}

export function PhotoLayoutGrid({
  layout,
  onLayoutChange,
  _onGapChange,
  _onLayoutComplete,
  selectedSize,
  onCheckout,
  gapSpacing = 16,
  _spacing,
  _setSpacing,
  cornerRounding,
  onCornerRoundingChange
}: PhotoLayoutGridProps) {
  const [_isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (gridRef.current) {
      setStartX(e.pageX - gridRef.current.offsetLeft);
      setScrollLeft(gridRef.current.scrollLeft);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!_isDragging || !gridRef.current) return;
    e.preventDefault();
    const x = e.pageX - gridRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    gridRef.current.scrollLeft = scrollLeft - walk;
  };

  const _handleImageReplace = (index: number) => {
    setSelectedImageIndex(index);
    setReplaceModalOpen(true);
  };

  const handleImageSelect = (newImageIndex: number) => {
    if (selectedImageIndex !== null) {
      const newLayout = { ...layout };
      newLayout.images[selectedImageIndex] = layout.images[newImageIndex];
      onLayoutChange(newLayout);
      setReplaceModalOpen(false);
      setSelectedImageIndex(null);
    }
  };

  // Filter out images that are already in the layout
  const availableImages = layout.images.filter((_, index) => 
    !layout.selectedIndices.includes(index)
  );

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
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
        >
          {availableImages.map((image, _filteredIndex) => (
            <div
              key={image.url}
              className="relative group cursor-pointer"
              onClick={() => {
                if (!_isDragging) {
                  const newLayout = { ...layout };
                  newLayout.selectedIndices = [...layout.selectedIndices, _filteredIndex].sort();
                  onLayoutChange(newLayout);
                }
              }}
            >
              <div className="relative aspect-square overflow-hidden shadow-md" style={{ borderRadius: `${cornerRounding}px` }}>
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
          scrapedImages={layout.images}
          selectedIndices={layout.selectedIndices}
          onSelect={handleImageSelect}
          onClose={() => setReplaceModalOpen(false)}
        />
      )}

      {/* Corner Rounding Adjustment */}
      <div className="flex items-center justify-between">
        <label htmlFor="cornerRounding" className="text-sm text-gray-600">Corner Rounding:</label>
        <input
          type="range"
          id="cornerRounding"
          min="0"
          max="50"
          value={cornerRounding}
          onChange={(e) => onCornerRoundingChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}
