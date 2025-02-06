import { useState } from 'react';
import type { PrintSize } from '@/app/types/order';

interface PrintBoardPreviewProps {
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
  isPortrait: boolean;
  onRemoveImage: (index: number) => void;
}

export function PrintBoardPreview({ layout, printSize, spacing, containMode, isPortrait, onRemoveImage }: PrintBoardPreviewProps) {
  const calculateGridLayout = () => {
    const imageCount = layout.images.length;
    if (isPortrait) {
      if (imageCount <= 2) return 'grid-cols-1';
      if (imageCount <= 4) return 'grid-cols-2';
      if (imageCount <= 9) return 'grid-cols-3';
      return 'grid-cols-3';
    } else {
      if (imageCount <= 2) return 'grid-cols-2';
      if (imageCount <= 6) return 'grid-cols-3';
      if (imageCount <= 12) return 'grid-cols-4';
      return 'grid-cols-4';
    }
  };

  return (
    <div>
      <div 
        className="relative w-full mx-auto bg-white rounded-lg shadow-sm"
        style={{
          aspectRatio: isPortrait 
            ? `${printSize.width}/${printSize.height}`
            : `${printSize.height}/${printSize.width}`,
          maxWidth: 'min(800px, calc(100vw - 2rem))',
          padding: '1rem'
        }}
      >
        <div 
          className={`grid h-full w-full ${calculateGridLayout()}`}
          style={{ 
            gap: `${spacing}rem`,
          }}
        >
          {layout.images.map((image, index) => (
            <div
              key={index}
              className="relative w-full h-full group"
            >
              <div className="absolute inset-0">
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className="w-full h-full rounded-lg"
                  style={{
                    objectFit: containMode ? 'contain' : 'cover',
                    backgroundColor: 'white'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-image.png';
                    console.error(`Failed to load image: ${image.url}`);
                  }}
                />
              </div>
              
              <div className="absolute inset-0 rounded-lg transition-all duration-200">
                <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-hover:ring-blue-500 transition-all duration-200" />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity rounded-lg" />
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(index);
                }}
                className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 